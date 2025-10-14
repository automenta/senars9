import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * React component registry for UI extensibility
 * Allows dynamic registration and loading of UI components for apps/demos
 */

const ComponentRegistryContext = createContext();

export const useComponentRegistry = () => {
  const context = useContext(ComponentRegistryContext);
  if (!context) {
    throw new Error('useComponentRegistry must be used within a ComponentRegistryProvider');
  }
  return context;
};

export const ComponentRegistryProvider = ({ children }) => {
  const [components, setComponents] = useState(new Map());
  const [activeComponents, setActiveComponents] = useState(new Set());

  const registerComponent = useCallback((componentName, componentConfig) => {
    setComponents(prev => new Map(prev).set(componentName, {
      ...componentConfig,
      name: componentName,
      registeredAt: new Date(),
      isActive: false
    }));

    console.log(`Component ${componentName} registered successfully`);
  }, []);

  const unregisterComponent = useCallback((componentName) => {
    setComponents(prev => {
      const newMap = new Map(prev);
      newMap.delete(componentName);
      return newMap;
    });

    setActiveComponents(prev => {
      const newSet = new Set(prev);
      newSet.delete(componentName);
      return newSet;
    });

    console.log(`Component ${componentName} unregistered`);
  }, []);

  const activateComponent = useCallback((componentName) => {
    const component = components.get(componentName);
    if (!component) {
      throw new Error(`Component ${componentName} not found`);
    }

    setActiveComponents(prev => new Set(prev).add(componentName));
    component.isActive = true;
    component.activatedAt = new Date();

    console.log(`Component ${componentName} activated`);
  }, [components]);

  const deactivateComponent = useCallback((componentName) => {
    setActiveComponents(prev => {
      const newSet = new Set(prev);
      newSet.delete(componentName);
      return newSet;
    });

    const component = components.get(componentName);
    if (component) {
      component.isActive = false;
      component.deactivatedAt = new Date();
    }

    console.log(`Component ${componentName} deactivated`);
  }, [components]);

  const renderComponent = useCallback((componentName, props = {}) => {
    const component = components.get(componentName);
    if (!component || !component.isActive) {
      return null;
    }

    if (component.render) {
      return component.render(props);
    }

    if (component.component) {
      const Component = component.component;
      return <Component key={componentName} {...props} />;
    }

    return null;
  }, [components]);

  const getComponent = useCallback((componentName) => {
    return components.get(componentName) || null;
  }, [components]);

  const getActiveComponents = useCallback(() => {
    return Array.from(activeComponents).map(name => components.get(name)).filter(Boolean);
  }, [activeComponents, components]);

  const getAllComponents = useCallback(() => {
    return Array.from(components.values());
  }, [components]);

  const value = {
    registerComponent,
    unregisterComponent,
    activateComponent,
    deactivateComponent,
    renderComponent,
    getComponent,
    getActiveComponents,
    getAllComponents,
    activeComponents: Array.from(activeComponents),
    totalComponents: components.size
  };

  return (
    <ComponentRegistryContext.Provider value={value}>
      {children}
    </ComponentRegistryContext.Provider>
  );
};

export default ComponentRegistryProvider;