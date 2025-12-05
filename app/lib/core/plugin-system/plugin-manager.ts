export interface Plugin {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();

  registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  isPluginEnabled(id: string): boolean {
    const plugin = this.plugins.get(id);
    return plugin?.enabled ?? false;
  }

  enablePlugin(id: string): void {
    const plugin = this.plugins.get(id);
    if (plugin) {
      plugin.enabled = true;
    }
  }

  disablePlugin(id: string): void {
    const plugin = this.plugins.get(id);
    if (plugin) {
      plugin.enabled = false;
    }
  }
}