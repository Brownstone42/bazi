param([Parameter(Mandatory=$true)][string]$SourcePath)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$outputDirectory = Join-Path $PSScriptRoot '../output/line-rich-menu'
[System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
$outputPath = Join-Path $outputDirectory 'diti-data-rich-menu-2500x1686.jpg'
if (Test-Path -LiteralPath $outputPath) { throw 'Output already exists; preserve the previous asset.' }
$source = [System.Drawing.Image]::FromFile($SourcePath)
$canvas = New-Object System.Drawing.Bitmap(2500, 1686)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
try {
  # Mechanical export only: preserve the generated artwork and three-panel layout.
  $graphics.Clear([System.Drawing.Color]::White)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage($source, 0, 0, 2500, 1686)
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $parameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
  try {
    $parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]92)
    $canvas.Save($outputPath, $codec, $parameters)
  } finally { $parameters.Dispose() }
} finally {
  $graphics.Dispose()
  $canvas.Dispose()
  $source.Dispose()
}
$verified = [System.Drawing.Image]::FromFile($outputPath)
try {
  [pscustomobject]@{ Path = [System.IO.Path]::GetFullPath($outputPath); Width = $verified.Width; Height = $verified.Height; Bytes = (Get-Item -LiteralPath $outputPath).Length }
} finally { $verified.Dispose() }
