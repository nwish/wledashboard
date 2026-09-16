import { getDb } from '../db/database.js'
import { getSpotifyAuthUrl, handleSpotifyCallback, disconnectSpotify, getSpotifyStatus } from '../services/spotifyService.js'

export async function spotifyRoutes(fastify) {
  fastify.get('/spotify/login', async (req, reply) => {
    let redirectUri = req.query.redirect_uri

    if (!redirectUri && req.headers.referer) {
      try {
        const refUrl = new URL(req.headers.referer)
        redirectUri = `${refUrl.origin}/api/spotify/callback`
      } catch {}
    }

    if (!redirectUri) {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http'
      const host = req.headers['x-forwarded-host'] || req.headers.host
      redirectUri = `${protocol}://${host}/api/spotify/callback`
    }

    const authUrl = getSpotifyAuthUrl(redirectUri, redirectUri)
    if (!authUrl) {
      reply.code(500).send({ error: 'Spotify Client ID/Secret not configured. Please save them in Settings.' })
      return
    }
    reply.redirect(authUrl)
  })

  fastify.get('/spotify/callback', async (req, reply) => {
    const { code, error, state } = req.query
    if (error) {
      reply.code(400).send({ error: 'Spotify authorization failed' })
      return
    }
    
    if (!code) {
      reply.code(400).send({ error: 'No authorization code provided' })
      return
    }

    try {
      let redirectUri = state
      if (!redirectUri) {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http'
        const host = req.headers['x-forwarded-host'] || req.headers.host
        redirectUri = `${protocol}://${host}/api/spotify/callback`
      }
      
      await handleSpotifyCallback(code, redirectUri)
      // Redirect back to frontend settings or dashboard
      const baseRedirect = process.env.FRONTEND_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173')
      reply.redirect(`${baseRedirect}/settings`)
    } catch (err) {
      req.log.error('Spotify callback error:', err)
      reply.code(500).send({ error: 'Failed to exchange authorization code' })
    }
  })

  fastify.delete('/spotify/disconnect', async (req, reply) => {
    disconnectSpotify()
    reply.send({ success: true })
  })

  fastify.get('/spotify/status', async (req, reply) => {
    const status = getSpotifyStatus()
    reply.send(status)
  })
}
