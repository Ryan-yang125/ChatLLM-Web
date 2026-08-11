# Design QA

- design target: Motion Lexicon v4 material language with the selected ChatLLM desktop concept
- reference: `/Users/yangrui/.codex/generated_images/019ff02c-f66f-72f0-ab91-fb9a7782f9f8/exec-e2d2d38c-c38f-4f2e-a357-f538921ae0e9.png`
- browser-rendered implementation: `audit/final-qa/desktop-empty-v2.png`
- combined comparison: `audit/final-qa/comparison-v2.png`
- logical viewport: 1487 × 1058
- comparison canvas: both captures normalized to 1280 × 720 by the browser capture pipeline
- mobile viewport: 390 × 844

## Primary interactions tested

- Create and delete conversations
- Fill the composer from a suggestion
- Open and close the command palette with Command-K
- Toggle light and dark themes
- Open and close the mobile conversation drawer
- Start and cancel the official WebLLM model preparation flow
- Confirm mobile horizontal overflow is zero

## Console check

- Browser console errors after the interaction pass: 0

## Comparison history

1. The first browser pass exposed the legacy 2023 WebLLM adapter failure. The engine was replaced with `@mlc-ai/web-llm` 0.2.84 and Llama 3.2 1B.
2. The final comparison confirmed the selected shell, warm material palette, raised chat surface, command-led navigation, compact controls, spacing rhythm, and responsive hierarchy.
3. Product-truth deltas are intentional: the current model is shown accurately, the first-run screen stays idle until model preparation begins, and the interface omits decorative helper copy.

## Findings

- P0: none
- P1: none
- P2: none

final result: passed
