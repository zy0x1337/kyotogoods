# Graph Report - .  (2026-08-22)

## Corpus Check
- Large corpus: 65 files · ~1,929,516 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 138 nodes · 190 edges · 11 communities (7 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Asset Registry & Bootstrap|Asset Registry & Bootstrap]]
- [[_COMMUNITY_Dependencies & Build|Dependencies & Build]]
- [[_COMMUNITY_Game Scene & Grid|Game Scene & Grid]]
- [[_COMMUNITY_Asset Pipeline Scripts|Asset Pipeline Scripts]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Shelf & Match Logic|Shelf & Match Logic]]
- [[_COMMUNITY_UI & Audio Systems|UI & Audio Systems]]
- [[_COMMUNITY_Goods Item Entity|Goods Item Entity]]
- [[_COMMUNITY_Helper Script|Helper Script]]
- [[_COMMUNITY_Capacitor Config|Capacitor Config]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `cropToContent()` - 10 edges
3. `Shelf` - 10 edges
4. `GridManager` - 9 edges
5. `GameScene` - 9 edges
6. `scripts` - 7 edges
7. `getLayoutScale()` - 7 edges
8. `ZenAudioEngine` - 7 edges
9. `defringe()` - 4 edges
10. `processImages()` - 4 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (11 total, 4 thin omitted)

### Community 0 - "Asset Registry & Bootstrap"
Cohesion: 0.10
Nodes (17): AVAILABLE_ASSETS, ITEM_BOTTOM_OFFSETS, boot(), DPR, GameEvents, getCanvasSize(), ItemDef, ITEMS (+9 more)

### Community 1 - "Dependencies & Build"
Cohesion: 0.09
Nodes (21): dependencies, @capacitor/android, @capacitor/cli, @capacitor/core, @fontsource/m-plus-rounded-1c, phaser, devDependencies, sharp (+13 more)

### Community 2 - "Game Scene & Grid"
Cohesion: 0.13
Nodes (5): GameScene, getLayoutScale(), getLevelBgKey(), GridManager, UIScene

### Community 3 - "Asset Pipeline Scripts"
Cohesion: 0.20
Nodes (16): cleanEdges(), cropToContent(), defringe(), defringeWhite(), detectKeyColor(), ENCODE, fillInteriorHoles(), findAlphaBounds() (+8 more)

### Community 4 - "TypeScript Config"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+9 more)

### Community 6 - "UI & Audio Systems"
Cohesion: 0.27
Nodes (4): labelStyle(), valueStyle(), WinModalScene, ZenAudioEngine

## Knowledge Gaps
- **51 isolated node(s):** `b64`, `content`, `config`, `name`, `version` (+46 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Shelf` connect `Shelf & Match Logic` to `Asset Registry & Bootstrap`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `GridManager` connect `Game Scene & Grid` to `Asset Registry & Bootstrap`, `Shelf & Match Logic`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `GameScene` connect `Game Scene & Grid` to `Asset Registry & Bootstrap`, `Shelf & Match Logic`, `UI & Audio Systems`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **What connects `b64`, `content`, `config` to the rest of the system?**
  _51 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Asset Registry & Bootstrap` be split into smaller, more focused modules?**
  _Cohesion score 0.09881422924901186 - nodes in this community are weakly interconnected._
- **Should `Dependencies & Build` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Game Scene & Grid` be split into smaller, more focused modules?**
  _Cohesion score 0.1286549707602339 - nodes in this community are weakly interconnected._