// Bank host-to-host APIs predate JSON and mostly still speak form-urlencoded, with the
// credentials repeated in the body of every single call. Reading that is the one thing
// their handlers all need and the JSON ones never do.

export const readForm = async (request: Request): Promise<URLSearchParams> => {
  try {
    return new URLSearchParams(await request.text())
  } catch {
    return new URLSearchParams()
  }
}

export const field = (form: URLSearchParams, name: string): string => form.get(name) ?? ''
