import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tilejamRoot = path.join(root, 'node_modules', 'tilejam');
const controllerPath = path.join(tilejamRoot, 'frontend', 'src', 'app', 'createAppController.ts');
const outputDir = path.join(root, 'public', 'tilejam');
const projectDir = path.join(outputDir, 'core2d');
const marker = 'CORE2D_TILEJAM_BOOTSTRAP_V1';

const bootstrap = `      // ${marker}\n      try {\n        const core2dProjectUrl = new URL("core2d/project.json", window.location.href).toString();\n        const core2dProject = await loadProjectFromUrl(core2dProjectUrl);\n        state.session.projectFileName = "core2d.tilejam.json";\n        state.session.projectFileHandle = null;\n        state.session.projectDirectoryHandle = null;\n        state.session.projectBaseUrl = core2dProjectUrl;\n        state.session.projectAssetResolutionMode = "hosted-demo";\n        state.session.pendingProjectFolderPrompt = null;\n        await loadProjectIntoState(state, core2dProject, "Loaded Core2D tileset.");\n        updateUnresolvedResources(state, "project", collectProjectUnresolvedResources(state));\n      } catch (error) {\n        const message = error instanceof Error ? error.message : "Unknown Core2D Tilejam bootstrap error.";\n        state.session.message = \`Core2D tileset bootstrap failed: \${message}\`;\n      }\n\n`;

const mode = process.argv[2] ?? 'prepare';

if (mode === 'prepare') {
  let source = await readFile(controllerPath, 'utf8');
  if (!source.includes(marker)) {
    const target = '      state.session.message = "Open a source image, working tilesheet, scene, or project to begin.";\n';
    if (!source.includes(target)) {
      throw new Error('Tilejam bootstrap insertion point was not found.');
    }
    source = source.replace(target, `${bootstrap}${target}`);
    await writeFile(controllerPath, source);
  }
  process.exit(0);
}

if (mode === 'finalize') {
  await mkdir(projectDir, { recursive: true });
  const project = {
    version: 1,
    sourceImage: '../../assets/tilesets/Tileset.png',
    workingImage: null,
    sceneFile: null,
    sourceTileWidth: 16,
    sourceTileHeight: 16,
    tileWidth: 16,
    tileHeight: 16,
    outputWidth: 1024,
    outputHeight: 1024,
    tiles: [],
    scene: null,
  };
  await writeFile(path.join(projectDir, 'project.json'), `${JSON.stringify(project, null, 2)}\n`);
  process.exit(0);
}

throw new Error(`Unknown Tilejam configuration mode: ${mode}`);
