User
- age
- phonenumber (id)
- nombre
- objetivo
- setso
- altura
- peso
- nivel de actividad fisica
- restriccion alimentaria
- enfermedades
- conversation: messages[]
- foodslog: foodlog[]


mensaje {
    sender: "bot" | "user"
    contenido del mensaje usamos el tipo en 2chat types (message)
}

foodlog {
    description: string
    totalmacros: Macros
    totalmicros: micros[]
    foods: food[]
}

food {
    description:string
    macros: Macros
    micros: micros[]
} 

macros {
    protein
    carbos
    fats
}

micros {
    name
    amount
}
