"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleNumberClick = (num: string) => {
    if (pin.length < 6) {
      setPin(pin + num)
    }
  }

  const handleClear = () => {
    setPin("")
    setError("")
  }

  const handleSubmit = async () => {
    if (pin.length !== 6) {
      setError("Le code PIN doit contenir 6 chiffres")
      return
    }

    setIsLoading(true)
    setError("")

    const success = await login(pin)

    if (success) {
      router.push("/")
    } else {
      setError("Code PIN invalide")
      setPin("")
    }

    setIsLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#8FD6D8] p-3 sm:p-6">
      <Card className="w-full max-w-md bg-[#DAF6FC] border-[#B5E7EE]">
        <CardHeader className="text-center space-y-3 pb-4">
          <div className="flex items-center justify-center">
            <img src="/icon.png" alt="Logo restaurant" className="h-16 w-16 sm:h-20 sm:w-20" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold text-[#081E3E]">SOPHIA PAD</CardTitle>
          <CardDescription className="text-sm sm:text-base text-[#061E3E]">
            Entrez votre code PIN pour continuer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {/* PIN Display - Now shows 6 dots instead of 4 */}
          <div className="flex justify-center gap-2 sm:gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg bg-white/70 flex items-center justify-center border-2 border-[#B5E7EE]"
              >
                <div
                  className={`h-3 w-3 sm:h-4 sm:w-4 rounded-full ${i < pin.length ? "bg-[#081E3E]" : "bg-[#B5E7EE]"}`}
                />
              </div>
            ))}
          </div>

          {error && <p className="text-center text-sm text-red-600">{error}</p>}

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                onClick={() => handleNumberClick(num.toString())}
                disabled={isLoading}
                className="h-14 sm:h-16 text-xl sm:text-2xl font-semibold bg-white hover:bg-[#DAF6FC] text-[#081E3E] border-[#B5E7EE]"
                variant="outline"
              >
                {num}
              </Button>
            ))}
            <Button
              onClick={handleClear}
              disabled={isLoading}
              className="h-14 sm:h-16 text-base sm:text-lg font-semibold bg-white hover:bg-[#DAF6FC] text-[#081E3E] border-[#B5E7EE]"
              variant="outline"
            >
              Effacer
            </Button>
            <Button
              onClick={() => handleNumberClick("0")}
              disabled={isLoading}
              className="h-14 sm:h-16 text-xl sm:text-2xl font-semibold bg-white hover:bg-[#DAF6FC] text-[#081E3E] border-[#B5E7EE]"
              variant="outline"
            >
              0
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || pin.length !== 6}
              className="h-14 sm:h-16 text-base sm:text-lg font-semibold bg-[#081E3E] hover:bg-[#061E3E] text-[#DAF6FC]"
            >
              OK
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
