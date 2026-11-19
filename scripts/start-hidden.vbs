Set shell = CreateObject("Wscript.Shell")
shell.Run "wsl.exe -e bash /mnt/c/Users/tzoan/OneDrive/Desktop/My_Scedule/scripts/keep-wsl.sh", 0, False
code = shell.Run("wsl.exe -e bash /mnt/c/Users/tzoan/OneDrive/Desktop/My_Scedule/scripts/start-orbit.sh", 0, True)
If code = 0 Then
  shell.Run "http://127.0.0.1:19890", 1, False
End If
