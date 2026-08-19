type Variant = 'success' | 'failure'

interface IProps {
  heading: string
  details: string
  variant: Variant
}

const variants: Record<Variant, string> = {
  success: 'text-purple-600',
  failure: 'text-red-500',
}

export const Status = ({ heading, details, variant }: IProps) => (
  <section className="space-y-2">
    <h2 className={variants[variant]}>{heading}</h2>
    <p className="text-lg text-gray-300">{details}</p>
  </section>
)
