/**
 * Example Usage of the Nebula Workflow Execution Engine
 *
 * This file demonstrates how to use the workflow engine.
 * Run with: npx ts-node tests/workflow-engine/example-usage.ts
 */

import {
  WorkflowExecutor,
  MockLLMProvider,
  WorkflowDefinition,
  createLinearWorkflow,
} from '../../src/lib/workflow-engine';

// Example 1: Simple linear workflow with an agent
async function runSimpleWorkflow() {
  console.log('=== Example 1: Simple Linear Workflow ===\n');

  const workflow = createLinearWorkflow(
    'Simple Q&A Agent',
    'You are a helpful assistant. Answer the user\'s question concisely.'
  );

  const executor = new WorkflowExecutor(workflow, {
    llmProvider: new MockLLMProvider({
      defaultResponse: 'The capital of France is Paris.',
    }),
  });

  const result = await executor.run({ question: 'What is the capital of France?' });

  console.log('Success:', result.success);
  console.log('Outputs:', result.outputs);
  console.log('Execution time:', result.executionTime, 'ms');
  console.log('');
}

// Example 2: Workflow with branching (if-else)
async function runBranchingWorkflow() {
  console.log('=== Example 2: Branching Workflow ===\n');

  const workflow: WorkflowDefinition = {
    id: 'branching-workflow',
    name: 'Sentiment Analysis with Branching',
    nodes: [
      { id: 'start', type: 'start', config: {} },
      {
        id: 'classify',
        type: 'classify',
        label: 'Classify Sentiment',
        config: {
          categories: [
            { id: 'positive', name: 'positive', description: 'Positive sentiment', outputHandle: 'positive' },
            { id: 'negative', name: 'negative', description: 'Negative sentiment', outputHandle: 'negative' },
            { id: 'neutral', name: 'neutral', description: 'Neutral sentiment', outputHandle: 'neutral' },
          ],
        },
      },
      {
        id: 'positive-response',
        type: 'set-state',
        label: 'Set Positive Response',
        config: {
          variable: 'response',
          valueType: 'string',
          value: 'Glad to hear you are happy!',
        },
      },
      {
        id: 'negative-response',
        type: 'set-state',
        label: 'Set Negative Response',
        config: {
          variable: 'response',
          valueType: 'string',
          value: 'Sorry to hear that. How can I help?',
        },
      },
      {
        id: 'neutral-response',
        type: 'set-state',
        label: 'Set Neutral Response',
        config: {
          variable: 'response',
          valueType: 'string',
          value: 'I understand. Is there anything else?',
        },
      },
      { id: 'end', type: 'end', config: {} },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'classify' },
      { id: 'e2', source: 'classify', target: 'positive-response', sourceHandle: 'positive' },
      { id: 'e3', source: 'classify', target: 'negative-response', sourceHandle: 'negative' },
      { id: 'e4', source: 'classify', target: 'neutral-response', sourceHandle: 'neutral' },
      { id: 'e5', source: 'positive-response', target: 'end' },
      { id: 'e6', source: 'negative-response', target: 'end' },
      { id: 'e7', source: 'neutral-response', target: 'end' },
    ],
  };

  const mockProvider = new MockLLMProvider();
  mockProvider.addClassifyResponse('happy', 'positive');
  mockProvider.addClassifyResponse('great', 'positive');
  mockProvider.addClassifyResponse('sad', 'negative');
  mockProvider.addClassifyResponse('bad', 'negative');

  const executor = new WorkflowExecutor(workflow, {
    llmProvider: mockProvider,
  });

  // Test with positive input
  const result1 = await executor.run({ input: 'I am so happy today!' });
  console.log('Input: "I am so happy today!"');
  console.log('Classified as:', executor.getContext().getVariable('classification'));
  console.log('Response:', executor.getContext().getVariable('response'));
  console.log('');

  // Test with negative input
  const result2 = await executor.run({ input: 'I am feeling sad' });
  console.log('Input: "I am feeling sad"');
  console.log('Classified as:', executor.getContext().getVariable('classification'));
  console.log('Response:', executor.getContext().getVariable('response'));
  console.log('');
}

// Example 3: Workflow with transformation
async function runTransformWorkflow() {
  console.log('=== Example 3: Transform Workflow ===\n');

  const workflow: WorkflowDefinition = {
    id: 'transform-workflow',
    name: 'Data Transformation',
    nodes: [
      { id: 'start', type: 'start', config: {} },
      {
        id: 'transform',
        type: 'transform',
        label: 'Transform Data',
        config: {
          code: `
            const data = input;
            const processed = {
              original: data.text,
              uppercase: data.text.toUpperCase(),
              wordCount: data.text.split(' ').length,
              timestamp: new Date().toISOString()
            };
            return processed;
          `,
          outputVariable: 'transformedData',
        },
      },
      { id: 'end', type: 'end', config: {} },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'transform' },
      { id: 'e2', source: 'transform', target: 'end' },
    ],
  };

  const executor = new WorkflowExecutor(workflow);

  const result = await executor.run({ text: 'Hello world from Nebula' });

  console.log('Input:', { text: 'Hello world from Nebula' });
  console.log('Transformed:', result.outputs.result);
  console.log('');
}

// Example 4: Workflow with conditions (if-else)
async function runConditionalWorkflow() {
  console.log('=== Example 4: Conditional Workflow ===\n');

  const workflow: WorkflowDefinition = {
    id: 'conditional-workflow',
    name: 'Age Verification',
    nodes: [
      { id: 'start', type: 'start', config: {} },
      {
        id: 'check-age',
        type: 'if-else',
        label: 'Check Age',
        config: {
          conditions: [
            { id: 'adult', expression: 'input.age >= 18', label: 'Adult', outputHandle: 'adult' },
            { id: 'teen', expression: 'input.age >= 13', label: 'Teen', outputHandle: 'teen' },
          ],
          elseOutputHandle: 'child',
        },
      },
      {
        id: 'adult-message',
        type: 'set-state',
        config: {
          variable: 'message',
          valueType: 'string',
          value: 'Welcome! Full access granted.',
        },
      },
      {
        id: 'teen-message',
        type: 'set-state',
        config: {
          variable: 'message',
          valueType: 'string',
          value: 'Welcome teen! Some content may be restricted.',
        },
      },
      {
        id: 'child-message',
        type: 'set-state',
        config: {
          variable: 'message',
          valueType: 'string',
          value: 'Welcome! Kids mode enabled.',
        },
      },
      { id: 'end', type: 'end', config: {} },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'check-age' },
      { id: 'e2', source: 'check-age', target: 'adult-message', sourceHandle: 'adult' },
      { id: 'e3', source: 'check-age', target: 'teen-message', sourceHandle: 'teen' },
      { id: 'e4', source: 'check-age', target: 'child-message', sourceHandle: 'child' },
      { id: 'e5', source: 'adult-message', target: 'end' },
      { id: 'e6', source: 'teen-message', target: 'end' },
      { id: 'e7', source: 'child-message', target: 'end' },
    ],
  };

  const executor = new WorkflowExecutor(workflow);

  // Test with different ages
  const ages = [25, 15, 8];

  for (const age of ages) {
    const result = await executor.run({ age });
    console.log(`Age ${age}:`, executor.getContext().getVariable('message'));
  }
  console.log('');
}

// Example 5: Workflow validation
async function validateWorkflow() {
  console.log('=== Example 5: Workflow Validation ===\n');

  // Invalid workflow (no start node)
  const invalidWorkflow: WorkflowDefinition = {
    id: 'invalid-workflow',
    name: 'Invalid Workflow',
    nodes: [
      { id: 'agent', type: 'agent', config: { instructions: 'Do something' } },
      { id: 'end', type: 'end', config: {} },
    ],
    edges: [{ id: 'e1', source: 'agent', target: 'end' }],
  };

  const executor = new WorkflowExecutor(invalidWorkflow);
  const validation = executor.validate();

  console.log('Workflow valid:', validation.valid);
  console.log('Errors:', validation.errors);
  console.log('');
}

// Run all examples
async function main() {
  try {
    await runSimpleWorkflow();
    await runBranchingWorkflow();
    await runTransformWorkflow();
    await runConditionalWorkflow();
    await validateWorkflow();

    console.log('All examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

main();
