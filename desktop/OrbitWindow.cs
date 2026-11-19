using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

internal static class Program
{
    private const string MutexName = "WeeklyOrbitPlanner.Window";

    [STAThread]
    private static void Main()
    {
        bool created;
        using (new Mutex(true, MutexName, out created))
        {
            if (!created)
            {
                FocusExisting();
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new OrbitWindow());
        }
    }

    private static void FocusExisting()
    {
        foreach (var process in Process.GetProcessesByName("OrbitPlanner"))
        {
            if (process.Id == Process.GetCurrentProcess().Id || process.MainWindowHandle == IntPtr.Zero)
            {
                continue;
            }

            ShowWindow(process.MainWindowHandle, 9);
            SetForegroundWindow(process.MainWindowHandle);
            return;
        }
    }

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr handle);

    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr handle, int command);
}

internal sealed class OrbitWindow : Form
{
    private readonly WebView2 view = new WebView2();

    public OrbitWindow()
    {
        Text = "Weekly Orbit Planner";
        StartPosition = FormStartPosition.CenterScreen;
        Width = 1280;
        Height = 860;
        MinimumSize = new Size(720, 520);
        BackColor = Color.FromArgb(10, 6, 16);
        var iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "orbit.ico");
        if (File.Exists(iconPath))
        {
            Icon = new Icon(iconPath);
        }

        view.Dock = DockStyle.Fill;
        Controls.Add(view);
        Shown += OnShown;
    }

    private static bool StartDiary()
    {
        var root = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", ".."));
        var script = Path.Combine(root, "scripts", "start-orbit.sh");
        if (!File.Exists(script))
        {
            return false;
        }

        var drive = char.ToLowerInvariant(root[0]);
        var wslRoot = "/mnt/" + drive + root.Substring(2).Replace('\\', '/');
        Process.Start(new ProcessStartInfo
        {
            FileName = "wsl.exe",
            Arguments = "-e bash \"" + wslRoot + "/scripts/keep-wsl.sh\"",
            CreateNoWindow = true,
            UseShellExecute = false,
            WindowStyle = ProcessWindowStyle.Hidden
        });
        var start = Process.Start(new ProcessStartInfo
        {
            FileName = "wsl.exe",
            Arguments = "-e bash \"" + wslRoot + "/scripts/start-orbit.sh\"",
            CreateNoWindow = true,
            UseShellExecute = false,
            WindowStyle = ProcessWindowStyle.Hidden
        });
        if (start == null)
        {
            return false;
        }
        if (!start.WaitForExit(90000))
        {
            return false;
        }
        return start.ExitCode == 0;
    }

    private async void OnShown(object sender, EventArgs args)
    {
        Shown -= OnShown;
        try
        {
            var dataFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "OrbitPlanner",
                "webview");
            Directory.CreateDirectory(dataFolder);
            var environment = await CoreWebView2Environment.CreateAsync(null, dataFolder);
            await view.EnsureCoreWebView2Async(environment);
            if (!StartDiary())
            {
                MessageBox.Show(
                    "Orbit Planner could not start. Open Docker Desktop, wait until it is running, then try again. Your diary was not changed.",
                    "Weekly Orbit Planner",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning);
                return;
            }
            view.Source = new Uri("http://127.0.0.1:19890/");
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                "Orbit Planner could not open the diary window. " + ex.Message,
                "Weekly Orbit Planner",
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning);
        }
    }
}
