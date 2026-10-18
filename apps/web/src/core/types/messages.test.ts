import { describe, expect, it } from 'vitest';

// The batch-H brief's non-negotiables for the wire mirrors: quoted from the schemas we inspect
// (honba-kokoro-messages + honba/schema/openapi/openapi.json) rather than copied from a codegen.
import { API_VERSION, SCHEMA_VERSION } from './messages';

describe('wire-contract constants', () => {
  it('pins the inspected envelope versions', () => {
    // honba-kokoro-messages/src/api.rs: API_VERSION = "1.0.0"
    expect(API_VERSION).toBe('1.0.0');
    // honba-kokoro-messages/src/events/event.rs: SCHEMA_VERSION: u32 = 4
    expect(SCHEMA_VERSION).toBe(4);
  });
});
