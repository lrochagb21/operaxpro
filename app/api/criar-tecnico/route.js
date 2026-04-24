import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { nome, email, senha, telefone, especialidade, endereco, cidade, status } = await request.json()

    // 1. Criar usuario no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })

    if (authError) {
      return Response.json({ error: authError.message }, { status: 400 })
    }

    // 2. Salvar na tabela usuarios com auth_id vinculado
    const { error: dbError } = await supabaseAdmin.from('usuarios').insert({
      empresa_id: 1,
      nome,
      email,
      telefone,
      especialidade,
      endereco,
      cidade,
      status,
      perfil: 'tecnico',
      auth_id: authData.user.id,
    })

    if (dbError) {
      // Reverter criacao do auth se falhar no banco
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return Response.json({ error: dbError.message }, { status: 400 })
    }

    return Response.json({ success: true, message: 'Tecnico criado com sucesso!' })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
