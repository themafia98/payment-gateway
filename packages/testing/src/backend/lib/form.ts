// Bank APIs mostly speak form-urlencoded, with credentials in every body. Reading that is
// the one thing their handlers need and the JSON ones never do.

export const readForm = async (request: Request): Promise<URLSearchParams> => {
  try {
    return new URLSearchParams(await request.text())
  } catch {
    return new URLSearchParams()
  }
}

export const field = (form: URLSearchParams, name: string): string => form.get(name) ?? ''
