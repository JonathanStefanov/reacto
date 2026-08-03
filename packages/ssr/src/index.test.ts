/**
 * Tests for @reacto-org/ssr
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { serverComponent, isServerComponent } from './server.js';
import { clientComponent, isClientComponent } from './client.js';
import { html } from './html.js';

describe('serverComponent', () => {
  it('creates a server component with metadata', () => {
    const MyComponent = serverComponent(async ({ user }) => {
      return React.createElement('div', null, `Hello ${user?.username ?? 'World'}`);
    }, 'MyComponent');

    expect(isServerComponent(MyComponent)).toBe(true);
    expect(MyComponent.displayName).toBe('MyComponent');
    expect(MyComponent.__serverComponent).toBe(true);
    expect(typeof MyComponent.fn).toBe('function');
  });

  it('fn can be called directly', async () => {
    const MyComponent = serverComponent(async ({ user }) => {
      return React.createElement('div', null, `Hello ${user?.username ?? 'World'}`);
    });

    const context = {
      req: {} as any,
      user: { id: 1, email: 'test@test.com', username: 'alice' },
      flash: () => {},
      path: '/',
      query: {},
    };

    const element = await MyComponent.fn!(context, {});
    expect(element).toBeDefined();
    expect(element.type).toBe('div');
  });
});

describe('clientComponent', () => {
  it('creates a client component with metadata', () => {
    function ChatPanel() {
      return React.createElement('div', null, 'Chat');
    }

    const Wrapped = clientComponent(ChatPanel, 'ChatPanel');

    expect(isClientComponent(Wrapped)).toBe(true);
    expect(Wrapped.chunkName).toBe('ChatPanel');
    expect(Wrapped.__clientComponent).toBe(true);
  });

  it('uses function name as default chunk name', () => {
    function MyWidget() {
      return React.createElement('div', null, 'Widget');
    }

    const Wrapped = clientComponent(MyWidget);
    expect(Wrapped.chunkName).toBe('MyWidget');
  });
});

describe('html helper', () => {
  it('interpolates values', () => {
    const name = 'Alice';
    const result = html`Hello ${name}!`;
    expect(result).toBe('Hello Alice!');
  });

  it('escapes HTML in interpolated values', () => {
    const input = '<script>alert("xss")</script>';
    const result = html`<div>${input}</div>`;
    expect(result).toBe('<div>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</div>');
  });

  it('handles multiple interpolations', () => {
    const a = 'one';
    const b = 'two';
    const result = html`${a} and ${b}`;
    expect(result).toBe('one and two');
  });

  it('handles empty values', () => {
    const result = html`Hello ${undefined} World`;
    expect(result).toBe('Hello  World');
  });
});
