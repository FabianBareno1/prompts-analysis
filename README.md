# Angular Audit Dashboard

This dashboard allows you to visualize audit data from CSV files in a modern, interactive web interface. You can use it locally or share it with others on your network.

## How to Use

### 1. Requirements

- Python 3.x installed (https://www.python.org/)
- A modern web browser (Chrome, Edge, Firefox, etc.)

### 2. Folder Structure

Place all the following files in the same folder:

- There is a folder named `files` that will contain:
  - `details` folder which contain all the `csv` files with the details of the analysis
  - `summaries` folder which will contain all the `.md` files
- All CSS styles are in `app-theme.css`.

### 3. Start the Local Server

1. Open a terminal (Command Prompt, PowerShell, or Terminal) in the folder containing your files.
2. Run the following command:

   ```sh
   python -m http.server 8000
   ```

3. You should see a message indicating the server is running.

### 4. Open the Dashboard

- In your web browser, go to:

  `http://localhost:8000`

### 5. Using the Dashboard

- The dashboard will automatically search for CSV files within the `files/details` folder.
- If any files are missing or you want to use your own data, you can manually upload a CSV for each section using the upload button.
- You can switch between the different sections and chart types from the interface.

### 6. Stopping the Server

- To stop the server, go back to the terminal and press `Ctrl + C`.

---

## Troubleshooting

- If you see errors loading CSV files, make sure the files are in the same folder as the HTML file.
- If you cannot access the dashboard, check your firewall settings or try a different port (e.g., `python -m http.server 8080`).

---

## Contact

For support or questions, contact your system administrator or the person who provided you with this dashboard.

---

**Note:** The main input file is now `index.js` and the data must be in the `files/` folder for the dashboard to work properly.
