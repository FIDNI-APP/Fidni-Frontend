import React, { useState } from "react";
import EquationEditor from "equation-editor-react";
import { DualPaneEditor } from "@/components/editor/DualPaneEditor";

/**
 * Comparison page to test equation-editor-react vs TipTap editor
 */
const EditorComparison: React.FC = () => {
  // State for equation-editor-react
  const [equation, setEquation] = useState("y=x^2+2x+1");

  // State for TipTap editor
  const [tiptapContent, setTiptapContent] = useState("<p>Type your content here. Use $ for inline math like $y=x^2$ or $$ for display math like $$\\frac{a}{b}$$</p>");

  return (
    <div className="editor-comparison">
      <div className="header">
        <h1>Math Editor Comparison</h1>
        <p className="subtitle">
          Compare equation-editor-react (simple, focused) vs TipTap (full-featured, complex)
        </p>
      </div>

      <div className="comparison-grid">
        {/* Equation Editor React */}
        <div className="editor-section">
          <div className="section-header">
            <h2>📐 Equation Editor React</h2>
            <div className="badge badge-simple">Simple</div>
          </div>

          <div className="features">
            <h3>Features:</h3>
            <ul>
              <li>✅ Pure math/equation focus</li>
              <li>✅ Lightweight (single purpose)</li>
              <li>✅ Quick to integrate</li>
              <li>❌ No rich text (bold, italic, etc.)</li>
              <li>❌ No images or links</li>
              <li>❌ Math only, no mixed content</li>
            </ul>
          </div>

          <div className="editor-wrapper">
            <p className="instructions">
              Type LaTeX commands: \pi, \theta, \sqrt, \frac, \sum, \sin, \cos, etc.
            </p>
            <div className="equation-editor-container">
              <EquationEditor
                value={equation}
                onChange={setEquation}
                autoCommands="pi theta sqrt sum prod alpha beta gamma rho delta epsilon zeta eta iota kappa lambda mu nu xi omicron sigma tau upsilon phi chi psi omega int frac infty partial nabla forall exists emptyset in notin subset subseteq supset supseteq cup cap times cdot div pm mp leq geq neq approx equiv lim"
                autoOperatorNames="sin cos tan sec csc cot arcsin arccos arctan sinh cosh tanh log ln lim max min sup inf det dim ker"
              />
            </div>
          </div>

          <div className="output-section">
            <h3>LaTeX Output:</h3>
            <pre className="latex-output">{equation}</pre>
          </div>
        </div>

        {/* TipTap Editor */}
        <div className="editor-section">
          <div className="section-header">
            <h2>📝 TipTap + KaTeX (Current)</h2>
            <div className="badge badge-complex">Full-Featured</div>
          </div>

          <div className="features">
            <h3>Features:</h3>
            <ul>
              <li>✅ Rich text formatting (bold, italic, colors)</li>
              <li>✅ Headings and lists</li>
              <li>✅ Images with resize</li>
              <li>✅ Links</li>
              <li>✅ Math formulas (inline & display)</li>
              <li>✅ 65+ formula templates</li>
              <li>✅ Themes and customization</li>
              <li>⚠️ More complex to maintain</li>
            </ul>
          </div>

          <div className="editor-wrapper">
            <p className="instructions">
              Use $ for inline math or $$ for display math. Full rich text editing available.
            </p>
            <div className="tiptap-editor-container">
              <DualPaneEditor
                content={tiptapContent}
                onChange={setTiptapContent}
                height="300px"
              />
            </div>
          </div>

          <div className="output-section">
            <h3>HTML Output (truncated):</h3>
            <pre className="html-output">
              {tiptapContent.substring(0, 200)}
              {tiptapContent.length > 200 ? "..." : ""}
            </pre>
          </div>
        </div>
      </div>

      <div className="decision-helper">
        <h2>🤔 Which should you use?</h2>
        <div className="decision-grid">
          <div className="decision-card">
            <h3>Use Equation Editor React if:</h3>
            <ul>
              <li>You only need math equations</li>
              <li>You want simplicity</li>
              <li>You don't need formatting or images</li>
              <li>Quick integration is priority</li>
            </ul>
          </div>
          <div className="decision-card">
            <h3>Keep TipTap if:</h3>
            <ul>
              <li>You need rich text + math together</li>
              <li>You need images, links, formatting</li>
              <li>You want pre-built formula templates</li>
              <li>Educational content needs structure</li>
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        .editor-comparison {
          padding: 2rem;
          max-width: 1600px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
            sans-serif;
        }

        .header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .header h1 {
          font-size: 2.5rem;
          color: #333;
          margin-bottom: 0.5rem;
        }

        .subtitle {
          color: #666;
          font-size: 1.1rem;
        }

        .comparison-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 3rem;
        }

        @media (max-width: 1200px) {
          .comparison-grid {
            grid-template-columns: 1fr;
          }
        }

        .editor-section {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }

        .section-header h2 {
          margin: 0;
          color: #333;
          font-size: 1.5rem;
        }

        .badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .badge-simple {
          background: #e3f2fd;
          color: #1976d2;
        }

        .badge-complex {
          background: #f3e5f5;
          color: #7b1fa2;
        }

        .features {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }

        .features h3 {
          margin-top: 0;
          font-size: 1rem;
          color: #555;
        }

        .features ul {
          margin: 0.5rem 0 0 0;
          padding-left: 1.5rem;
          line-height: 1.8;
        }

        .features li {
          color: #666;
          font-size: 0.95rem;
        }

        .editor-wrapper {
          margin-bottom: 1.5rem;
        }

        .instructions {
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 0.75rem;
          padding: 0.5rem;
          background: #fffbea;
          border-left: 3px solid #fbbf24;
          border-radius: 4px;
        }

        .equation-editor-container {
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          padding: 1rem;
          background: #fafafa;
          min-height: 150px;
        }

        .tiptap-editor-container {
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }

        .output-section {
          background: #f5f5f5;
          border-radius: 8px;
          padding: 1rem;
        }

        .output-section h3 {
          margin-top: 0;
          font-size: 1rem;
          color: #555;
          margin-bottom: 0.75rem;
        }

        .latex-output,
        .html-output {
          background: #fff;
          padding: 1rem;
          border-radius: 4px;
          border: 1px solid #ddd;
          color: #d81b60;
          font-family: 'Courier New', monospace;
          font-size: 0.9rem;
          overflow-x: auto;
          margin: 0;
          max-height: 150px;
          overflow-y: auto;
        }

        .html-output {
          color: #1976d2;
        }

        .decision-helper {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .decision-helper h2 {
          text-align: center;
          margin-top: 0;
          margin-bottom: 2rem;
        }

        .decision-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        @media (max-width: 768px) {
          .decision-grid {
            grid-template-columns: 1fr;
          }
        }

        .decision-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .decision-card h3 {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 1.2rem;
        }

        .decision-card ul {
          margin: 0;
          padding-left: 1.5rem;
          line-height: 1.8;
        }

        .decision-card li {
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  );
};

export default EditorComparison;
