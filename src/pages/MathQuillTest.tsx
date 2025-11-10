import React, { useState } from 'react';
import { addStyles, EditableMathField, StaticMathField } from 'react-mathquill';
import 'mathquill/build/mathquill.css';

// Add mathquill styles
addStyles();

export const MathQuillTest: React.FC = () => {
  const [latex1, setLatex1] = useState('\\frac{1}{\\sqrt{2}}\\cdot 2');
  const [latex2, setLatex2] = useState('x^2 + y^2 = r^2');
  const [latex3, setLatex3] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="mb-8 border-b pb-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              React MathQuill Test Page
            </h1>
            <p className="text-gray-600">
              Testing react-mathquill as an alternative to TipTap editor for LaTeX/math formulas
            </p>
          </div>

          {/* Example 1: Pre-filled equation */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Example 1: Editable Pre-filled Equation
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <EditableMathField
                latex={latex1}
                onChange={(mathField) => {
                  setLatex1(mathField.latex());
                }}
                style={{
                  fontSize: '20px',
                  padding: '10px',
                  border: '2px solid #4F46E5',
                  borderRadius: '8px',
                  minHeight: '60px',
                  width: '100%',
                  backgroundColor: 'white'
                }}
              />
              <div className="mt-3 p-3 bg-white rounded border border-gray-300">
                <p className="text-sm text-gray-600 mb-1">LaTeX Output:</p>
                <code className="text-sm font-mono text-indigo-600">{latex1}</code>
              </div>
            </div>
          </div>

          {/* Example 2: Another equation */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Example 2: Pythagorean Theorem
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <EditableMathField
                latex={latex2}
                onChange={(mathField) => {
                  setLatex2(mathField.latex());
                }}
                style={{
                  fontSize: '20px',
                  padding: '10px',
                  border: '2px solid #10B981',
                  borderRadius: '8px',
                  minHeight: '60px',
                  width: '100%',
                  backgroundColor: 'white'
                }}
              />
              <div className="mt-3 p-3 bg-white rounded border border-gray-300">
                <p className="text-sm text-gray-600 mb-1">LaTeX Output:</p>
                <code className="text-sm font-mono text-green-600">{latex2}</code>
              </div>
            </div>
          </div>

          {/* Example 3: Empty field */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Example 3: Empty Editable Field
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <EditableMathField
                latex={latex3}
                onChange={(mathField) => {
                  setLatex3(mathField.latex());
                }}
                style={{
                  fontSize: '20px',
                  padding: '10px',
                  border: '2px solid #F59E0B',
                  borderRadius: '8px',
                  minHeight: '60px',
                  width: '100%',
                  backgroundColor: 'white'
                }}
              />
              <div className="mt-3 p-3 bg-white rounded border border-gray-300">
                <p className="text-sm text-gray-600 mb-1">LaTeX Output:</p>
                <code className="text-sm font-mono text-amber-600">
                  {latex3 || '(empty)'}
                </code>
              </div>
            </div>
          </div>

          {/* Example 4: Static display */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Example 4: Static Display (Non-editable)
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-3">
                Displaying the quadratic formula:
              </p>
              <div className="bg-white p-4 rounded border border-gray-300 flex items-center justify-center">
                <StaticMathField
                  style={{ fontSize: '24px' }}
                >
                  {'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'}
                </StaticMathField>
              </div>
            </div>
          </div>

          {/* Comparison info */}
          <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              React MathQuill vs TipTap
            </h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p><strong>Pros of React MathQuill:</strong></p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Specialized for mathematical input</li>
                <li>Better UX for typing formulas (auto-completes braces, handles subscripts/superscripts naturally)</li>
                <li>Cleaner LaTeX output</li>
                <li>Simpler API for math-focused use cases</li>
              </ul>
              <p className="mt-3"><strong>Cons of React MathQuill:</strong></p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Only handles math formulas (no rich text editing)</li>
                <li>Would need to be combined with another editor for text content</li>
                <li>Less flexibility than TipTap for general-purpose editing</li>
              </ul>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h3 className="text-md font-semibold text-gray-800 mb-2">
              How to use:
            </h3>
            <ul className="text-sm text-gray-700 space-y-1 list-disc ml-5">
              <li>Click in any editable field to start typing</li>
              <li>Use ^ for superscripts (e.g., x^2)</li>
              <li>Use _ for subscripts (e.g., a_1)</li>
              <li>Type \frac and it will create a fraction automatically</li>
              <li>Type \sqrt for square roots</li>
              <li>Use arrow keys to navigate through the formula</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MathQuillTest;
