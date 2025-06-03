import { spawn } from 'bun';

const isDevelopment = process.env.NODE_ENV !== 'production';

class DevServer {
  private processes: any[] = [];

  async start() {
    console.log('🚀 Starting development server...');

    try {
      // Start asset building in watch mode
      const assetProcess = spawn({
        cmd: ['bun', 'run', 'build.config.ts', '--watch'],
        stdio: ['inherit', 'inherit', 'inherit'],
        env: {
          ...process.env,
          NODE_ENV: 'development',
        },
      });
      this.processes.push(assetProcess);

      // Give assets time to build initially
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Start the main Bun server
      const serverProcess = spawn({
        cmd: ['bun', 'run', '--watch', 'src/index.ts'],
        stdio: ['inherit', 'inherit', 'inherit'],
        env: {
          ...process.env,
          NODE_ENV: 'development',
          PORT: process.env.PORT || '3000',
        },
      });
      this.processes.push(serverProcess);

      console.log('✅ Development server started!');
      console.log('🔗 Server: http://localhost:3000');
      console.log('👀 Watching for changes...');
      console.log('💡 Press Ctrl+C to stop');

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      // Wait for processes
      await Promise.race(this.processes.map(p => p.exited));
    } catch (error) {
      console.error('❌ Failed to start development server:', error);
      await this.stop();
      process.exit(1);
    }
  }

  async stop() {
    console.log('🛑 Stopping development server...');

    for (const process of this.processes) {
      try {
        process.kill();
        await process.exited;
      } catch (error) {
        // Process might already be dead
      }
    }

    this.processes = [];
    console.log('✅ Development server stopped');
  }

  private setupGracefulShutdown() {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

    signals.forEach(signal => {
      process.on(signal, async () => {
        console.log(`\n📤 Received ${signal}, shutting down...`);
        await this.stop();
        process.exit(0);
      });
    });
  }
}

// Start the development server if this file is run directly
if (import.meta.main) {
  const devServer = new DevServer();
  devServer.start();
}

export { DevServer };

