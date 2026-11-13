#!/usr/bin/env bash
set -euo pipefail

packages_root="${1:?usage: generate-termux-bootstrap-notices.sh TERMUX_PACKAGES_ROOT ARCH OUTPUT_FILE}"
arch="${2:?usage: generate-termux-bootstrap-notices.sh TERMUX_PACKAGES_ROOT ARCH OUTPUT_FILE}"
output_file="${3:?usage: generate-termux-bootstrap-notices.sh TERMUX_PACKAGES_ROOT ARCH OUTPUT_FILE}"
deb_dir="${packages_root}/output"

if [[ ! -d "$deb_dir" ]]; then
  echo "Missing Termux package output directory: $deb_dir" >&2
  exit 1
fi

mkdir -p "$(dirname "$output_file")"
printf 'package,version,architecture,license,source_build_script\n' > "$output_file"

shopt -s nullglob
debs=("$deb_dir"/*.deb)
if (( ${#debs[@]} == 0 )); then
  echo "No .deb packages were produced for $arch" >&2
  exit 1
fi

for deb in "${debs[@]}"; do
  package="$(dpkg-deb -f "$deb" Package)"
  version="$(dpkg-deb -f "$deb" Version)"
  package_arch="$(dpkg-deb -f "$deb" Architecture)"

  source_script=""
  source_relative="NOT_FOUND"
  subpackage_script="$(find "$packages_root/packages" -type f -name "$package.subpackage.sh" -not -path '*/.git/*' -print -quit || true)"

  if [[ -f "$packages_root/packages/$package/build.sh" ]]; then
    source_script="$packages_root/packages/$package/build.sh"
    source_relative="${source_script#"$packages_root"/}"
  elif [[ -n "$subpackage_script" ]]; then
    # Split packages inherit their license from the parent package build.sh.
    parent_dir="$(dirname "$subpackage_script")"
    if [[ -f "$parent_dir/build.sh" ]]; then
      source_script="$parent_dir/build.sh"
      source_relative="${source_script#"$packages_root"/} (subpackage: ${subpackage_script#"$packages_root"/})"
    fi
  fi

  license="UNRESOLVED - inspect upstream package metadata"
  if [[ -n "$source_script" ]]; then
    raw_license="$(grep -E '^[[:space:]]*TERMUX_PKG_LICENSE=' "$source_script" | head -n 1 || true)"
    if [[ -n "$raw_license" ]]; then
      license="$(printf '%s' "${raw_license#*=}" | tr -d '"' | tr -d "'")"
    fi
  fi

  # Quote CSV fields and escape embedded quotes.
  package="${package//\"/\"\"}"
  version="${version//\"/\"\"}"
  package_arch="${package_arch//\"/\"\"}"
  license="${license//\"/\"\"}"
  source_relative="${source_relative//\"/\"\"}"
  printf '"%s","%s","%s","%s","%s"\n' \
    "$package" "$version" "$package_arch" "$license" "$source_relative" >> "$output_file"
done

echo "Generated package/license inventory: $output_file"
echo "Package count: ${#debs[@]}"
if grep -q 'UNRESOLVED' "$output_file"; then
  echo "WARNING: some package licenses need manual review before release." >&2
fi
