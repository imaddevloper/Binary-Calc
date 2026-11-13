package com.binarycalculator.termux;

import android.content.Context;
import android.os.Build;
import android.os.UserHandle;
import android.system.Os;
import android.system.OsConstants;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

final class TermuxBootstrapInstaller {
    private static final String PREFIX_NAME = "usr";
    private static final String STAGING_NAME = "usr-staging";
    private static final String SYMLINK_SEPARATOR = "←";
    private static final String INSTALL_MARKER = ".binarycalc-termux-managed";
    private static final String INSTALLING_MARKER = ".binarycalc-termux-installing";

    private TermuxBootstrapInstaller() {}

    static File getFilesRoot(Context context) {
        String path = context.getFilesDir().getAbsolutePath()
            .replaceFirst("^/data/user/0/", "/data/data/");
        return new File(path);
    }

    static File getPrefix(Context context) {
        return new File(getFilesRoot(context), PREFIX_NAME);
    }

    static String getSupportedArchitecture() {
        for (String abi : Build.SUPPORTED_ABIS) {
            if ("arm64-v8a".equals(abi)) return "aarch64";
            if ("armeabi-v7a".equals(abi)) return "arm";
        }
        throw new IllegalStateException("This build supports ARM Android devices only (arm64-v8a / armeabi-v7a).");
    }

    static boolean isInstalled(Context context) {
        File prefix = getPrefix(context);
        File bash = new File(prefix, "bin/bash");
        File apt = new File(prefix, "bin/apt");
        File dpkg = new File(prefix, "bin/dpkg");
        File pkg = new File(prefix, "bin/pkg");
        File termuxExec = new File(prefix, "lib/libtermux-exec-ld-preload.so");
        File marker = new File(prefix, INSTALL_MARKER);
        File installing = new File(prefix, INSTALLING_MARKER);
        File secondStageLock = new File(prefix,
            "etc/termux/termux-bootstrap/second-stage/termux-bootstrap-second-stage.sh.lock");
        return marker.isFile() && !installing.exists()
            && bash.isFile() && bash.canExecute()
            && apt.isFile() && apt.canExecute()
            && dpkg.isFile() && dpkg.canExecute()
            && pkg.isFile() && pkg.canExecute()
            && termuxExec.isFile() && termuxExec.canRead()
            && secondStageLock.isFile();
    }

    static synchronized void install(Context context) throws Exception {
        if (isInstalled(context)) return;

        String arch = getSupportedArchitecture();
        String assetName = "termux-bootstrap-" + arch + ".zip";
        verifyAssetChecksum(context, assetName);
        File files = getFilesRoot(context);
        File staging = new File(files, STAGING_NAME);
        File prefix = getPrefix(context);

        deleteRecursively(staging);
        if (prefix.exists() || isSymbolicLink(prefix)) {
            File marker = new File(prefix, INSTALL_MARKER);
            File installing = new File(prefix, INSTALLING_MARKER);
            if (prefix.isDirectory() && marker.isFile() && installing.isFile()) {
                // Only an interrupted first-run installation is safe to remove.
                deleteRecursively(prefix);
            } else {
                throw new IllegalStateException(
                    "An existing Termux prefix was found but is incomplete or damaged. It was left untouched to protect user files."
                );
            }
        }
        if (!staging.mkdirs() && !staging.isDirectory()) {
            throw new IllegalStateException("Could not create the Termux bootstrap staging directory.");
        }

        List<String[]> symlinks = new ArrayList<>();
        try (InputStream asset = context.getAssets().open(assetName);
             ZipInputStream zip = new ZipInputStream(asset)) {
            ZipEntry entry;
            byte[] buffer = new byte[32 * 1024];
            while ((entry = zip.getNextEntry()) != null) {
                String name = entry.getName();
                // ZIP tools may preserve a leading "./" depending on platform/version.
                // Normalize it before recognizing bootstrap metadata or validating paths.
                while (name.startsWith("./")) name = name.substring(2);
                if (name.isEmpty() && entry.isDirectory()) {
                    zip.closeEntry();
                    continue;
                }
                if ("SYMLINKS.txt".equals(name)) {
                    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                    int count;
                    while ((count = zip.read(buffer)) != -1) bytes.write(buffer, 0, count);
                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                            new java.io.ByteArrayInputStream(bytes.toByteArray()), StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            int split = line.indexOf(SYMLINK_SEPARATOR);
                            if (split <= 0 || split == line.length() - SYMLINK_SEPARATOR.length()) {
                                throw new IllegalStateException("Invalid Termux bootstrap symlink metadata.");
                            }
                            symlinks.add(new String[] {
                                line.substring(0, split),
                                line.substring(split + SYMLINK_SEPARATOR.length())
                            });
                        }
                    }
                    continue;
                }

                File target = resolveInside(staging, name);
                if (entry.isDirectory()) {
                    if (!target.isDirectory() && !target.mkdirs()) {
                        throw new IllegalStateException("Could not create bootstrap directory: " + name);
                    }
                } else {
                    File parent = target.getParentFile();
                    if (parent != null && !parent.isDirectory() && !parent.mkdirs()) {
                        throw new IllegalStateException("Could not create bootstrap parent directory: " + name);
                    }
                    try (FileOutputStream output = new FileOutputStream(target)) {
                        int count;
                        while ((count = zip.read(buffer)) != -1) output.write(buffer, 0, count);
                    }
                    String permissionPath = name;
                    while (permissionPath.startsWith("./")) permissionPath = permissionPath.substring(2);
                    if (permissionPath.startsWith("bin/") || permissionPath.startsWith("libexec/")
                            || permissionPath.equals("lib/apt/apt-helper")
                            || permissionPath.startsWith("lib/apt/methods/")) {
                        Os.chmod(target.getAbsolutePath(), 0700);
                    }
                }
                zip.closeEntry();
            }
        } catch (Exception error) {
            deleteRecursively(staging);
            throw new IllegalStateException("Termux bootstrap extraction failed. " + error.getMessage(), error);
        }

        if (symlinks.isEmpty()) {
            deleteRecursively(staging);
            throw new IllegalStateException("The Termux bootstrap is missing SYMLINKS.txt.");
        }

        boolean prefixActivated = false;
        try {
            for (String[] item : symlinks) {
                File link = resolveInside(staging, item[1]);
                File parent = link.getParentFile();
                if (parent != null && !parent.isDirectory() && !parent.mkdirs()) {
                    throw new IllegalStateException("Could not create symlink parent: " + item[1]);
                }
                if (link.exists() || isSymbolicLink(link)) link.delete();
                Os.symlink(item[0], link.getAbsolutePath());
            }

            File home = new File(files, "home");
            File tmp = new File(staging, "tmp");
            File marker = new File(staging, INSTALL_MARKER);
            try (FileOutputStream output = new FileOutputStream(marker)) {
                output.write("Managed by Binary-Calc embedded Termux installer.\n".getBytes(StandardCharsets.UTF_8));
            }
            Os.chmod(marker.getAbsolutePath(), 0600);
            File installingMarker = new File(staging, INSTALLING_MARKER);
            try (FileOutputStream output = new FileOutputStream(installingMarker)) {
                output.write("First-run installation in progress.\n".getBytes(StandardCharsets.UTF_8));
            }
            Os.chmod(installingMarker.getAbsolutePath(), 0600);
            if (!home.isDirectory() && !home.mkdirs()) throw new IllegalStateException("Could not create Termux HOME.");
            if (!tmp.isDirectory() && !tmp.mkdirs()) throw new IllegalStateException("Could not create Termux TMPDIR.");
            Os.chmod(home.getAbsolutePath(), 0700);
            Os.chmod(tmp.getAbsolutePath(), 0700);

            if (!staging.renameTo(prefix)) {
                throw new IllegalStateException("Could not atomically activate the Termux bootstrap.");
            }
            prefixActivated = true;
            runBootstrapSecondStage(context, files, prefix, arch);
            runBootstrapSmokeTest(context, files, prefix, arch);
            File completedInstallMarker = new File(prefix, INSTALLING_MARKER);
            if (!completedInstallMarker.delete()) {
                throw new IllegalStateException("Could not finalize the Termux bootstrap installation state.");
            }
            if (!isInstalled(context)) {
                throw new IllegalStateException("Termux bootstrap second-stage or runtime validation did not complete.");
            }
        } catch (Exception error) {
            deleteRecursively(staging);
            // Roll back a newly activated but invalid prefix so a later retry can recover.
            // Existing user prefixes are never removed: installation rejects them before extraction.
            if (prefixActivated) deleteRecursively(prefix);
            throw error;
        }
    }


    private static void runBootstrapSecondStage(Context context, File files, File prefix, String arch) throws Exception {
        File secondStage = new File(prefix,
            "etc/termux/termux-bootstrap/second-stage/termux-bootstrap-second-stage.sh");
        File directPreload = new File(prefix, "lib/libtermux-exec-direct-ld-preload.so");
        if (!secondStage.isFile()) {
            throw new IllegalStateException("The Termux bootstrap second-stage script is missing.");
        }
        if (!directPreload.isFile()) {
            throw new IllegalStateException("The Termux exec bootstrap library is missing.");
        }
        runBootstrapCommand(context, files, prefix, arch, directPreload, secondStage.getAbsolutePath());
    }

    private static void runBootstrapSmokeTest(Context context, File files, File prefix, String arch) throws Exception {
        File primaryPreload = new File(prefix, "lib/libtermux-exec-ld-preload.so");
        if (!primaryPreload.isFile()) {
            throw new IllegalStateException("Termux did not configure its primary exec library during bootstrap.");
        }
        String script = "set -eu; "
            + "test -x \"$PREFIX/bin/bash\"; "
            + "test -x \"$PREFIX/bin/apt\"; "
            + "test -x \"$PREFIX/bin/dpkg\"; "
            + "test -x \"$PREFIX/bin/pkg\"; "
            + "id -u >/dev/null; uname -m >/dev/null; "
            + "apt --version >/dev/null; dpkg --version >/dev/null; "
            + "printf 'BINARYCALC_TERMUX_BOOTSTRAP_SMOKE_OK\\n'";
        String output = runBootstrapCommand(context, files, prefix, arch, primaryPreload, "-lc", script);
        if (!output.contains("BINARYCALC_TERMUX_BOOTSTRAP_SMOKE_OK")) {
            throw new IllegalStateException("Termux runtime smoke test did not produce its success marker. Output: " + output);
        }
    }

    private static String runBootstrapCommand(Context context, File files, File prefix, String arch,
                                              File preloadLibrary, String... shellArguments) throws Exception {
        File home = new File(files, "home");
        File bash = new File(prefix, "bin/bash");
        File linker = new File("/system/bin/" + ("aarch64".equals(arch) ? "linker64" : "linker"));
        boolean useSystemLinker = Build.VERSION.SDK_INT >= 29;
        if (useSystemLinker && !linker.canExecute()) {
            throw new IllegalStateException("Android system linker is unavailable: " + linker.getAbsolutePath());
        }
        if (!bash.canExecute() || !preloadLibrary.isFile()) {
            throw new IllegalStateException("Termux Bash or its exec compatibility library is missing.");
        }

        List<String> command = new ArrayList<>();
        command.add(useSystemLinker ? linker.getAbsolutePath() : bash.getAbsolutePath());
        if (useSystemLinker) command.add(bash.getAbsolutePath());
        for (String argument : shellArguments) command.add(argument);

        ProcessBuilder builder = new ProcessBuilder(command);
        builder.directory(home);
        builder.redirectErrorStream(true);
        java.util.Map<String, String> environment = builder.environment();

        String uid = String.valueOf(android.os.Process.myUid());
        String userId = String.valueOf(UserHandle.myUserId());
        String prefixPath = prefix.getAbsolutePath();
        String homePath = home.getAbsolutePath();
        String filesPath = files.getAbsolutePath();
        String dataPath = files.getParentFile() == null ? filesPath : files.getParentFile().getAbsolutePath();
        android.content.pm.ApplicationInfo appInfo = context.getApplicationInfo();

        environment.put("HOME", homePath);
        environment.put("PREFIX", prefixPath);
        environment.put("TERMUX_PREFIX", prefixPath);
        environment.put("PATH", prefixPath + "/bin:/system/bin");
        environment.put("SHELL", bash.getAbsolutePath());
        environment.put("TMPDIR", prefixPath + "/tmp");
        environment.put("LD_PRELOAD", preloadLibrary.getAbsolutePath());
        environment.remove("LD_LIBRARY_PATH");
        environment.put("LANG", "en_US.UTF-8");
        environment.put("TERM", "xterm-256color");
        environment.put("COLORTERM", "truecolor");
        environment.put("TERMUX_VERSION", "0.118.0");
        environment.put("TERMUX_PACKAGE_MANAGER", "apt");
        environment.put("TERMUX_PACKAGE_ARCH", arch);
        environment.put("TERMUX_APP__PACKAGE_NAME", context.getPackageName());
        environment.put("TERMUX_APP__VERSION_NAME", "0.118.0");
        environment.put("TERMUX_APP__VERSION_CODE", "118");
        environment.put("TERMUX_APP__PID", String.valueOf(android.os.Process.myPid()));
        environment.put("TERMUX_APP__UID", uid);
        environment.put("TERMUX_APP__IS_DEBUGGABLE_BUILD",
            String.valueOf((appInfo.flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0));
        environment.put("TERMUX_APP__APK_PATH", appInfo.sourceDir);
        environment.put("TERMUX_APP__IS_INSTALLED_ON_EXTERNAL_STORAGE", "false");
        environment.put("TERMUX_APP__USER_ID", userId);
        environment.put("TERMUX_APP__TARGET_SDK", String.valueOf(appInfo.targetSdkVersion));
        environment.put("TERMUX_APP__PACKAGE_MANAGER", "apt");
        environment.put("TERMUX_APP__PACKAGE_VARIANT", "apt-android-7");
        environment.put("TERMUX_APP__FILES_DIR", filesPath);
        environment.put("TERMUX_APP__DATA_DIR", dataPath);
        environment.put("TERMUX__ROOTFS", filesPath);
        environment.put("TERMUX__UID", uid);
        environment.put("TERMUX__USER_ID", userId);
        environment.put("TERMUX__HOME", homePath);
        environment.put("TERMUX__PREFIX", prefixPath);
        environment.put("ANDROID__BUILD_VERSION_SDK", String.valueOf(Build.VERSION.SDK_INT));

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                new java.io.FileInputStream("/proc/self/attr/current"), StandardCharsets.UTF_8))) {
            String processContext = reader.readLine();
            if (processContext != null && !processContext.isEmpty()) {
                environment.put("TERMUX_APP__SE_PROCESS_CONTEXT", processContext);
            }
        } catch (Exception ignored) {
            // termux-exec can read the process context from /proc itself when available.
        }

        Process process = builder.start();
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (InputStream stream = process.getInputStream()) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = stream.read(buffer)) != -1) {
                if (output.size() < 128 * 1024) {
                    int writable = Math.min(count, 128 * 1024 - output.size());
                    output.write(buffer, 0, writable);
                }
            }
        }
        int exitCode = process.waitFor();
        String log = output.toString(StandardCharsets.UTF_8.name());
        if (exitCode != 0) {
            throw new IllegalStateException("Termux bootstrap command failed with exit code "
                + exitCode + ". Output: " + log);
        }
        return log;
    }

    private static void verifyAssetChecksum(Context context, String assetName) throws Exception {
        String expected;
        try (InputStream input = context.getAssets().open(assetName + ".sha256");
             BufferedReader reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.US_ASCII))) {
            expected = reader.readLine();
        }
        if (expected == null || !expected.matches("(?i)[0-9a-f]{64}")) {
            throw new SecurityException("Missing or invalid Termux bootstrap SHA-256 manifest.");
        }

        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = context.getAssets().open(assetName)) {
            byte[] buffer = new byte[64 * 1024];
            int count;
            while ((count = input.read(buffer)) != -1) digest.update(buffer, 0, count);
        }
        StringBuilder actual = new StringBuilder(64);
        for (byte value : digest.digest()) actual.append(String.format(java.util.Locale.ROOT, "%02x", value & 0xff));
        if (!expected.equalsIgnoreCase(actual.toString())) {
            throw new SecurityException("Termux bootstrap checksum verification failed.");
        }
    }

    private static File resolveInside(File root, String relativePath) throws Exception {
        if (relativePath == null || relativePath.isEmpty() || relativePath.startsWith("/")) {
            throw new SecurityException("Invalid bootstrap path.");
        }
        File candidate = new File(root, relativePath);
        String rootPath = root.getCanonicalPath() + File.separator;
        String candidatePath = candidate.getCanonicalPath();
        if (!candidatePath.startsWith(rootPath)) throw new SecurityException("Bootstrap path escaped staging directory.");
        return candidate;
    }

    private static boolean isSymbolicLink(File file) {
        try {
            return (Os.lstat(file.getAbsolutePath()).st_mode & OsConstants.S_IFMT) == OsConstants.S_IFLNK;
        } catch (Exception ignored) {
            return false;
        }
    }

    private static void deleteRecursively(File file) {
        if (file == null || (!file.exists() && !isSymbolicLink(file))) return;
        if (file.isDirectory() && !isSymbolicLink(file)) {
            File[] children = file.listFiles();
            if (children != null) for (File child : children) deleteRecursively(child);
        }
        file.delete();
    }
}
