Add-Type -AssemblyName System.windows.forms
$folderBrowser = New-Object System.Windows.Forms.FolderBrowserDialog
$dummyForm = New-Object System.Windows.Forms.Form
$dummyForm.TopMost = $true
$folderBrowser.ShowDialog($dummyForm)
