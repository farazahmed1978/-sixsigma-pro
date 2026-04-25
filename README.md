# SixSigma Pro

A professional, browser-based **Lean Six Sigma analysis platform** built with React. Upload CSV data and perform statistical analysis using 11+ tools — no software license or installation required.

**Owner:** Faraz Ahmed  
**Live Demo:** *(your Vercel URL here after deployment)*

---

## Features

- **11 Statistical Tools** — Control Charts, Pareto, Histogram, Capability Analysis, Scatter Plot, Box Plot, Run Chart, Fishbone Diagram, FMEA, MSA/Gage R&R, Value Stream Map
- **CSV Data Import** — Drag-and-drop CSV files or use built-in sample data
- **Real-time Calculations** — Cp, Cpk, UCL/LCL, %GRR, Pearson r, RPN, and more
- **DMAIC Framework** — Tools organized by Six Sigma phase
- **Educational Resources** — Built-in reference guide, glossary, and sigma level table
- **No Backend Required** — Fully client-side, works in any modern browser

---

## Tools Included

| Tool | Phase | Purpose |
|------|-------|---------|
| Control Chart (Individuals) | Control | Monitor process stability, detect out-of-control points |
| Pareto Chart | Analyze | 80/20 analysis to prioritize problem causes |
| Histogram | Measure | Visualize data distribution and normality |
| Capability Analysis | Measure | Calculate Cp, Cpk, sigma level, PPM |
| Scatter Plot | Analyze | Correlation analysis between two variables |
| Box Plot | Analyze | Compare distributions across multiple groups |
| Run Chart | Measure | Detect trends and runs in time-series data |
| Fishbone Diagram | Analyze | Interactive cause-and-effect diagram (6M) |
| FMEA | Analyze | Failure Mode & Effects Analysis with RPN scoring |
| MSA / Gage R&R | Measure | Measurement System Analysis (%GRR, NDC) |
| Value Stream Map | Analyze | Process mapping with VA/NVA classification |

---

## Tech Stack

- **React 18** — UI framework
- **React Router v6** — Client-side routing
- **Recharts** — Chart library
- **PapaParse** — CSV parsing
- **Math.js** — Statistical calculations
- **jsPDF** — PDF export (FMEA)

---

## Getting Started (Local Development)

### Prerequisites
- Node.js 16+ and npm

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/sixsigma-pro.git
cd sixsigma-pro

# 2. Install dependencies
npm install

# 3. Start development server
npm start
```

The app will open at `http://localhost:3000`.

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `/build` folder.

---

## Deploying to GitHub

### Step 1: Create a GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **+** icon → **New repository**
3. Name it `sixsigma-pro` (or any name you prefer)
4. Set it to **Public** or **Private**
5. Do **NOT** initialize with README (you already have one)
6. Click **Create repository**

### Step 2: Push Your Code

```bash
# In your project directory:
git init
git add .
git commit -m "Initial commit: SixSigma Pro platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sixsigma-pro.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## Deploying to Vercel

### Method 1: Deploy from GitHub (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in (or sign up — it's free)
2. Click **"Add New"** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your `sixsigma-pro` GitHub repo
5. Vercel will auto-detect it as a React app
6. Leave all settings as default:
   - Framework Preset: `Create React App`
   - Build Command: `npm run build`
   - Output Directory: `build`
7. Click **"Deploy"**
8. Wait ~2 minutes — Vercel builds and deploys automatically
9. Your live URL will be: `https://sixsigma-pro.vercel.app` (or similar)

### Method 2: Deploy with Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# From your project directory
vercel

# Follow prompts:
# - Link to existing project? No
# - What's your project name? sixsigma-pro
# - In which directory is your code? ./
# - Want to override settings? No

# Deploy to production
vercel --prod
```

### Automatic Deployments

Once connected to GitHub, every `git push` to `main` automatically triggers a new deployment on Vercel. No manual steps needed.

### Custom Domain (Optional)

1. In Vercel dashboard → your project → **Settings** → **Domains**
2. Add your custom domain (e.g., `sixsigmapro.com`)
3. Follow DNS configuration instructions

---

## Project Structure

```
sixsigma-pro/
├── public/
│   └── index.html          # HTML template (Google Fonts loaded here)
├── src/
│   ├── App.js              # Router — all routes defined here
│   ├── App.css             # Global design system & CSS variables
│   ├── index.js            # React entry point
│   ├── components/
│   │   ├── Layout.js       # Sidebar navigation + topbar
│   │   ├── Layout.css
│   │   └── CSVUploader.js  # Drag-and-drop CSV upload component
│   ├── pages/
│   │   ├── Dashboard.js    # Landing/home page
│   │   ├── Dashboard.css
│   │   ├── ToolPage.js     # Tool wrapper with metadata panel
│   │   ├── ToolPage.css
│   │   ├── Resources.js    # Educational resources & DMAIC guide
│   │   ├── Resources.css
│   │   ├── About.js        # About page
│   │   └── About.css
│   └── tools/
│       ├── Tool.css        # Shared tool styles
│       ├── ControlChart.js
│       ├── ParetoChart.js
│       ├── Histogram.js
│       ├── CapabilityAnalysis.js
│       ├── ScatterPlot.js
│       ├── BoxPlot.js
│       ├── RunChart.js
│       ├── FishboneDiagram.js
│       ├── FMEA.js
│       ├── MSA.js
│       ├── GageRR.js
│       └── ValueStreamMap.js
├── .gitignore
├── vercel.json             # Vercel SPA routing config
├── package.json
└── README.md
```

---

## CSV Format Guide

Each tool accepts specific CSV formats. Use the **"Load Sample Data"** button in any tool to see the exact format required, or refer to the tool's info panel.

| Tool | Required Columns |
|------|-----------------|
| Control Chart | `value` (or any single numeric column) |
| Pareto Chart | `category`, `count` |
| Histogram | Any single numeric column |
| Capability Analysis | Any single numeric column |
| Scatter Plot | Any two numeric columns |
| Box Plot | `group`, `value` |
| Run Chart | `value` (time-ordered) |
| MSA / Gage R&R | `part`, `operator`, `trial`, `measurement` |

---

## License

MIT License — free to use, modify, and distribute.

---

*Built with ❤️ by Faraz Ahmed using React and open-source libraries.*
