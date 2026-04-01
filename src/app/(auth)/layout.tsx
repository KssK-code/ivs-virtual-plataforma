export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center py-8 px-4"
      style={{ background: 'linear-gradient(135deg, #F0FAFA 0%, #E8F4F8 100%)' }}
    >
      {children}
    </div>
  )
}
