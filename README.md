<div align="center">
  <img src="docs/assets/banner_v3.jpg" alt="RepoRewind Banner" width="100%" />
  
  <h1>🕰️ RepoRewind</h1>
  <p><b>Interactive 3D Git History Visualizer & AI Storyteller</b></p>

  [![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)](#)
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](#)
  [![React](https://img.shields.io/badge/React-18-61DAFB.svg)](#)

  <p>Turn your codebase evolution into a stunning 3D movie with zero configuration.</p>
</div>

---

## 🌟 Overview

**RepoRewind** is a next-generation developer tool that transforms dry `git log` histories into breathtaking 3D WebGL visualizations. It instantly spins up a local server and opens a beautiful dark-mode interface where your repository is represented as a living, glowing 3D network graph.

Instead of reading old pull requests, just scrub the timeline and watch your architecture evolve over time. 

What makes it unique? It features a **Local-First AI Storyteller** (powered by WebGPU & WebLLM) that analyzes architectural shifts and tells you the story of *why* the codebase changed during any given era, directly in your browser.

## ✨ Features

- **🚀 Zero-Config Magic**: Run one command in any `.git` repository, and the 3D player opens instantly. No API keys, no databases, no setup.
- **🕰️ 4D Time Scrubbing**: Drag the timeline slider to literally watch files pop into existence, microservices split, and heavy refactors unfold.
- **🤖 Local AI Commentary**: Analyzes your git history and provides context-aware summaries using local models in the browser (100% free and private).
- **💅 Premium Aesthetics**: Built with React Three Fiber, featuring bloom lighting effects, glassmorphism UI, and smooth Framer Motion micro-animations.

---

## 🚀 Quick Start

The fastest way to experience RepoRewind is to run it directly via `npx` (requires Node.js v18+).

```bash
npx reporewind analyze .
```

*Note: On first run with AI features enabled, the browser will download a lightweight 4-bit quantization model (~1.5GB) into its cache for local inference.*

### Manual Installation (Development)

1. **Clone the repository**
```bash
git clone https://github.com/Cristofervaltz/RepoRewind.git
cd RepoRewind
```

2. **Install Dependencies**
```bash
npm install
cd ui && npm install
```

3. **Run the CLI & UI**
```bash
npm run dev analyze .
```

---

## 🕹️ Usage (Client Side)

Once the local server starts, RepoRewind automatically opens `http://localhost:3000` in your default browser. 

- **Scroll** to zoom in and out of the 3D code graph.
- **Drag** to rotate the camera and explore the architecture.
- **Scrub the Timeline** at the bottom to travel through time. 
- Click the **AI Storyteller** button to generate a narrative of the current timeline era.

---

## 🏗️ Architecture

RepoRewind uses a highly modular setup:
- **CLI Backend (TypeScript/Node.js)**: Parses `.git` logs recursively, calculates the folder/file trees, and serves a lightweight Express API.
- **3D Frontend (Vite + React)**: Uses `react-force-graph-3d` for the node visualization and `framer-motion` for sleek UI transitions.
- **Local AI (WebLLM)**: Downloads and executes small, powerful models (like Phi-3 or Llama-3-8B) using WebGPU directly in the browser tab.

---

## 🤝 Contributing
Contributions are welcome! Please open an issue or submit a pull request for new visualizers, better timeline caching, or UI improvements.

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
