import { spawn } from 'node:child_process'

const command = process.platform === 'win32' ? 'uni.cmd' : 'uni'

const child = spawn(command, ['build'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    UNI_OUTPUT_DIR: 'pwa-dist',
  },
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
