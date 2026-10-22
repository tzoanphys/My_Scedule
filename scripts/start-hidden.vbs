Set shell = CreateObject("Wscript.Shell")
shell.Run "wsl.exe -e bash /mnt/c/Users/tzoan/OneDrive/Desktop/My_Scedule/scripts/keep-wsl.sh", 0, False
code = shell.Run("wsl.exe -e bash /mnt/c/Users/tzoan/OneDrive/Desktop/My_Scedule/scripts/start-orbit.sh", 0, True)
If code = 0 Then
  shell.Run "http://localhost:1989", 1, False
End If
