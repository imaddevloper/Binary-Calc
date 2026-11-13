package com.binarycalculator.termux;

import android.content.Context;
import android.os.Build;
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
        File bash = new File(getPrefix(context), "bin/bash");
        File apt = new File(getPrefix(context), "bin/apt");
        return bash.isFile() && bash.canExecute() && apt.isFile() && apt.canExecute();
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
            if (prefix.isDirectory() && marker.isFile()) {
                // Recover an install interrupted after atomic activation.
                deleteRecursively(prefix);
            } else {
                throw new IllegalStateException(
                    "An existing Termux prefix was found but failed validation. It was left untouched to protect user files."
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
                    if (name.startsWith("bin/") || name.startsWith("libexec/")
                            || name.startsWith("lib/apt/apt-helper")
                            || name.startsWith("lib/apt/methods/")) {
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
            if (!home.isDirectory() && !home.mkdirs()) throw new IllegalStateException("Could not create Termux HOME.");
            if (!tmp.isDirectory() && !tmp.mkdirs()) throw new IllegalStateException("Could not create Termux TMPDIR.");
            Os.chmod(home.getAbsolutePath(), 0700);
            Os.chmod(tmp.getAbsolutePath(), 0700);

            if (!staging.renameTo(prefix)) {
                throw new IllegalStateException("Could not atomically activate the Termux bootstrap.");
            }
            prefixActivated = true;
            if (!isInstalled(context)) {
                throw new IllegalStateException("Termux bootstrap was extracted but bash/apt validation failed.");
            }
        } catch (Exception error) {
            deleteRecursively(staging);
            // Roll back a newly activated but invalid prefix so a later retry can recover.
            // Existing user prefixes are never removed: installation rejects them before extraction.
            if (prefixActivated) deleteRecursively(prefix);
            throw error;
        }
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
