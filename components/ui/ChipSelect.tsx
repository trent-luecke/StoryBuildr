// components/ui/ChipSelect.tsx
'use client'

interface Option {
  value: string
  label: string
}

interface ChipSelectProps {
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
}

export function ChipSelect({ options, value, onChange }: ChipSelectProps) {
  function toggle(optionValue: string) {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            data-selected={selected}
            onClick={() => toggle(option.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
              selected
                ? 'border-[#81A1D3] bg-[#f0f5fb] text-[#81A1D3]'
                : 'border-gray-200 bg-white text-[#444444] hover:border-[#81A1D3]'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
