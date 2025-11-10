import React, { useState } from "react";
import EquationEditor from "equation-editor-react";

/**
 * Test component for the equation-editor-react package
 * This is a simpler alternative to the TipTap + KaTeX setup
 */
const EquationEditorTest: React.FC = () => {
  const [equation, setEquation] = useState("y=x");

  return (
    <div className="equation-editor-test">
      <div className="editor-container">
        <h2>Equation Editor React - Test</h2>
        <p className="description">
          Type LaTeX commands with a backslash (\) to insert mathematical symbols.
          For example: \pi, \theta, \sqrt, \sum, \sin, \cos
        </p>

        <div className="editor-wrapper">
          <EquationEditor
            value={equation}
            onChange={setEquation}
            autoCommands="pi theta sqrt sum prod alpha beta gamma rho delta epsilon zeta eta iota kappa lambda mu nu xi omicron sigma tau upsilon phi chi psi omega int frac infty"
            autoOperatorNames="sin cos tan sec csc cot arcsin arccos arctan sinh cosh tanh log ln lim"
          />
        </div>

        <div className="output">
          <h3>LaTeX Output:</h3>
          <pre className="latex-output">{equation}</pre>
        </div>
      </div>

      <style>{`
        .equation-editor-test {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
            sans-serif;
        }

        .editor-container {
          background: white;
          border-radius: 8px;
          padding: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .editor-container h2 {
          margin-top: 0;
          color: #333;
          font-size: 1.8rem;
          margin-bottom: 0.5rem;
        }

        .description {
          color: #666;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }

        .editor-wrapper {
          border: 2px solid #e0e0e0;
          border-radius: 4px;
          padding: 1rem;
          background: #fafafa;
          min-height: 150px;
          margin-bottom: 2rem;
        }

        .output {
          background: #f5f5f5;
          border-radius: 4px;
          padding: 1rem;
        }

        .output h3 {
          margin-top: 0;
          color: #555;
          font-size: 1.2rem;
          margin-bottom: 0.75rem;
        }

        .latex-output {
          background: #fff;
          padding: 1rem;
          border-radius: 4px;
          border: 1px solid #ddd;
          color: #d81b60;
          font-family: 'Courier New', monospace;
          font-size: 1rem;
          overflow-x: auto;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default EquationEditorTest;
