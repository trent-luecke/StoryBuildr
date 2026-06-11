// Brings @testing-library/jest-dom's custom matcher type augmentation
// (toBeInTheDocument, toHaveClass, toHaveAttribute, ...) into the tsc program.
// jest.setup.ts performs this import at runtime, but it is excluded from tsconfig,
// so this declaration file makes the matcher types visible to `tsc --noEmit`.
import '@testing-library/jest-dom'
