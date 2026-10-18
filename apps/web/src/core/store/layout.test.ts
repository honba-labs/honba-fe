import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLayoutStore } from './layout';
import type { ApiClient } from '../api/client';

const DOC = { version: 1, grid: { root: true } };

function fakeClient() {
  return {
    getLayouts: vi.fn().mockResolvedValue({ layouts: { default: DOC } }),
    putLayout: vi.fn().mockResolvedValue({ detail: 'saved' }),
    deleteLayout: vi.fn().mockResolvedValue({ detail: 'deleted' }),
  } as unknown as ApiClient & {
    getLayouts: ReturnType<typeof vi.fn>;
    putLayout: ReturnType<typeof vi.fn>;
    deleteLayout: ReturnType<typeof vi.fn>;
  };
}

beforeEach(() => {
  useLayoutStore.getState().reset();
});

describe('useLayoutStore', () => {
  it('load() fetches GET /profile/layouts and marks ready', async () => {
    const client = fakeClient();
    await useLayoutStore.getState().load(client);
    expect(client.getLayouts).toHaveBeenCalledTimes(1);
    expect(useLayoutStore.getState().layouts.default).toEqual(DOC);
    expect(useLayoutStore.getState().status).toBe('ready');
  });

  it('load() records the failure and status error', async () => {
    const client = fakeClient();
    (client.getLayouts as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('network down'),
    );
    await useLayoutStore.getState().load(client);
    expect(useLayoutStore.getState().status).toBe('error');
    expect(useLayoutStore.getState().error).toContain('network down');
  });

  it('save() optimistically applies the document then persists it', async () => {
    const client = fakeClient();
    await useLayoutStore.getState().save(client, 'orb-scalp', DOC);
    expect(useLayoutStore.getState().layouts['orb-scalp']).toEqual(DOC);
    expect(client.putLayout).toHaveBeenCalledWith('orb-scalp', DOC);
    expect(useLayoutStore.getState().status).toBe('ready');
  });

  it('remove() drops the named layout and persists the delete', async () => {
    const client = fakeClient();
    await useLayoutStore.getState().save(client, 'gone', DOC);
    useLayoutStore.getState().setActive('gone');
    expect(useLayoutStore.getState().activeLayout).toBe('gone');
    await useLayoutStore.getState().remove(client, 'gone');
    expect(useLayoutStore.getState().layouts['gone']).toBeUndefined();
    expect(client.deleteLayout).toHaveBeenCalledWith('gone');
    // Removing the active layout clears the pointer (removals always do).
    expect(useLayoutStore.getState().activeLayout).toBeNull();
  });

  it('save() surfaces an error without clobbering existing layouts', async () => {
    const client = fakeClient();
    await useLayoutStore.getState().load(client);
    (client.putLayout as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('revision conflict'),
    );
    await useLayoutStore.getState().save(client, 'x', DOC);
    // The failed save must not leave the dead document in local state.
    expect(useLayoutStore.getState().layouts.x).toBeUndefined();
    expect(useLayoutStore.getState().status).toBe('error');
    expect(useLayoutStore.getState().error).toContain('revision conflict');
    expect(useLayoutStore.getState().layouts.default).toEqual(DOC);
  });
});
