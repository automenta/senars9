class ProviderRegistry {
  constructor() {
    this.providers = new Map();
    this.defaultProviderId = null;
  }

  register(id, provider) {
    this.providers.set(id, provider);
    if (!this.defaultProviderId) {
      this.defaultProviderId = id;
    }
    return this;
  }

  get(providerId = null) {
    const id = providerId || this.defaultProviderId;
    if (!id || !this.providers.has(id)) {
      throw new Error(`Provider "${id}" not found or no default provider is set.`);
    }
    return this.providers.get(id);
  }

  has(providerId) {
    return this.providers.has(providerId);
  }

  list() {
    return Array.from(this.providers.keys());
  }

  size() {
    return this.providers.size;
  }

  clear() {
    this.providers.clear();
    this.defaultProviderId = null;
  }
}

export default ProviderRegistry;