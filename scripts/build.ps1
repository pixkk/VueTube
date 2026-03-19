$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$aliasDrive = "X:"

try {
  # Nuxt 2/Bridge tooling can fail on Windows paths with non-ASCII chars.
  subst $aliasDrive $projectRoot
  Set-Location "$aliasDrive\NUXT"
  npm run generate

  Set-Location $aliasDrive
  npx cap sync android
  npx cap run android
}
finally {
  Set-Location $projectRoot
  subst $aliasDrive /D | Out-Null
}