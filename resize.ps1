Add-Type -AssemblyName System.Drawing
$imgPath = "c:\Users\Digo\Desktop\isapaulino\public\CURSOR.png"
$newImgPath = "c:\Users\Digo\Desktop\isapaulino\public\CURSOR_small.png"
$img = [System.Drawing.Image]::FromFile($imgPath)
$newImg = New-Object System.Drawing.Bitmap(16, 22)
$g = [System.Drawing.Graphics]::FromImage($newImg)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, 16, 22)
$newImg.Save($newImgPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$newImg.Dispose()
$img.Dispose()
