/**
 * Profile Page — Protected, shows watched movies
 */
import React from 'react';
import { ModelManager } from '@reacto-org/core';
import { serverComponent } from '@reacto-org/ssr';
import { Review } from '../models/index.js';
import { Layout } from '../templates/Layout.js';

const GENRE_EMOJI: Record<string, string> = {
  Action: '💥', Comedy: '😂', Drama: '🎭', Horror: '👻',
  'Sci-Fi': '🚀', Romance: '💕', Thriller: '😱', Documentary: '📹',
};

export const ProfilePage = serverComponent(async (ctx) => {
  if (!ctx.user) {
    return (
      <Layout title="Profile — CineLog" user={null}>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p>Please <a href="/login" style={{ color: '#6c5ce7' }}>login</a> to view your profile.</p>
        </div>
      </Layout>
    );
  }

  const reviews = await ModelManager.objects(Review)
    .filter({ userId: ctx.user.id })
    .with('movie')
    .orderBy('-watchedAt')
    .all();

  return (
    <Layout title={`${ctx.user.username}'s Profile — CineLog`} user={ctx.user}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <div style={{ background: '#1a1a2e', borderRadius: 12, border: '1px solid #2a2a4a' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a2a4a' }}>
            <h2 style={{ fontSize: 16, color: '#fff', margin: 0 }}>
              📋 {ctx.user.username}'s Watched Movies
            </h2>
          </div>
          <div style={{ padding: 20 }}>
            {reviews.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'center', padding: 20 }}>
                No movies watched yet. <a href="/" style={{ color: '#6c5ce7' }}>Browse movies</a> to get started!
              </p>
            ) : reviews.map(review => (
              <div key={review.id} style={{
                display: 'flex',
                gap: 12,
                padding: '12px 0',
                borderBottom: '1px solid #2a2a4a',
                alignItems: 'center',
              }}>
                <div style={{
                  width: 50,
                  height: 70,
                  background: '#16213e',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}>
                  {GENRE_EMOJI[review.movie?.genre || ''] || '🎬'}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 14, color: '#fff', margin: 0 }}>
                    <a href={`/movies/${review.movieId}`} style={{ color: '#fff', textDecoration: 'none' }}>
                      {review.movie?.title || 'Unknown'}
                    </a>
                  </h3>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    Watched {new Date(review.watchedAt).toLocaleDateString()}
                  </div>
                  {review.comment && (
                    <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{review.comment}</div>
                  )}
                </div>
                <div style={{ color: '#f1c40f', fontSize: 16 }}>
                  {'⭐'.repeat(review.rating)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}, 'ProfilePage');
