$app = New-Object -ComObject Shell.Application
$folder = $app.BrowseForFolder(0, 'Select Git Repository', 0)
if ($folder) { $folder.Self.Path }
