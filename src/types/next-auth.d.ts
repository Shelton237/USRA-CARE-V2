import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      countryId: number | null
      officeId: number | null
      firstName: string
      lastName: string
      avatar: string
      countryName: string | null
      countrySymbol: string | null
    }
  }
}
