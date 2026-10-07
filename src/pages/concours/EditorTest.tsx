/**
 * Minimal test page — JUST a CompactTipTapEditor on a blank page.
 * Used to isolate whether the editor itself is broken inside the concours
 * routes, or whether the surrounding UI is the problem.
 *
 * Route: /concours/editor-test
 */
import { useState } from 'react';
import CompactTipTapEditor from '@/components/editor/CompactTipTapEditor';

export default function EditorTestPage() {
  const [content, setContent] = useState('<p>Tape ici...</p>');

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', padding: 40 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', marginBottom: 16 }}>
          Editor test (no modal, no taxonomy, no nothing)
        </h1>

        <div style={{ background: '#fff', borderRadius: 12, padding: 16 }}>
          <CompactTipTapEditor
            content={content}
            onChange={setContent}
            placeholder="Test…"
            minHeight="200px"
          />
        </div>

        <pre style={{
          marginTop: 20, padding: 12, background: '#1a1a1a', color: '#b8b4ac',
          fontSize: 11, borderRadius: 8, overflow: 'auto',
        }}>
          {content}
        </pre>
      </div>
    </div>
  );
}
