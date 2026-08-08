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

## ✨ Features

### 🌳 Interactive 3D Architecture Graph
- **Dynamic Physics Engine**: Watch branches smoothly grow and shrink as you travel through time. 
- **Folder Collapsing**: Click any purple directory node to neatly collapse it, pulling all child files into a single glowing orange node.
- **3D Text Labels**: Files and folders clearly display their names floating in 3D space.
- **Visual Hierarchy**: 
  - 🟡 **Golden Root**: The core of your repository.
  - 🟣 **Purple Nodes**: Directories (Click to collapse).
  - 🟠 **Orange Nodes**: Collapsed directories.
  - 🔵 **Cyan Nodes**: Source files.
- **Particle Flows**: Animated directional particles flow through the graph, illustrating dependencies and structure.

### 🕰️ 4D Time Scrubbing
- Drag the timeline slider to seamlessly travel through the history of your repository.
- Watch files pop into existence, microservices split, and massive refactors unfold right before your eyes.
- Our optimized physics cache ensures the layout remains perfectly stable across time jumps—no sudden layout resets!

### 🤖 Local AI Storyteller (WebLLM)
- Uses WebGPU and local quantization models (like Phi-3 or Llama-3-8B) directly in your browser tab.
- Generates context-aware narrative summaries of what was happening in the codebase during specific eras.
- **100% Private**: Your code never leaves your machine.

### 🚀 Zero-Config Magic
- Run one command in any `.git` repository, and the 3D player opens instantly. No API keys, no databases, no complex setup.

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

## 🕹️ Controls

Once the local server starts, RepoRewind automatically opens `http://localhost:3000` in your default browser. 

- **🖱️ Drag**: Rotate the camera around the 3D graph.
- **⚙️ Scroll**: Zoom in and out.
- **👆 Click on Purple Folders**: Expand or collapse the directory.
- **⏳ Timeline Scrubber**: Travel forward and backward through Git history.
- **⏱️ Time-Travel to this Era**: Physically run `git checkout` to roll back your actual hard drive files to the selected era.
- **🤖 AI Storyteller**: Click the generate button to read an AI narrative of the current timeline era.

---

## 🏗️ Architecture

RepoRewind uses a highly modular setup:
- **CLI Backend (TypeScript/Node.js)**: Parses `.git` logs recursively, calculates the folder/file trees, and serves a lightweight Express API.
- **3D Frontend (Vite + React)**: Uses `react-force-graph-3d` and `Three.js` for the node visualization, with custom Canvas texture generation for glowing sprites.
- **Local AI (WebLLM)**: Downloads and executes small, powerful LLMs using WebGPU directly in the browser tab.

---

## 🤝 Contributing
Contributions are welcome! Please open an issue or submit a pull request for new visualizers, better timeline caching, or UI improvements.

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
