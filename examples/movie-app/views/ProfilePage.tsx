/**
 * Profile Page — Protected, shows watched movies
 */
import { ModelManager } from '@reacto-org/core';
import { serverComponent } from '@reacto-org/ssr';
import React from 'react';
import { Review } from '../models/index.js';
import { Layout } from '../templates/Layout.js';

export const ProfilePage = serverComponent(async (ctx) => {
  if (!ctx.user) {
    return (
      <Layout title="Profile — CineLog">
        <div className="container">
          <p className="empty-state">Please <a href="/login">login</a> to view your profile.</p>
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
    <Layout title={`${ctx.user.username}'s Profile — CineLog`}>
      <div className="container">
        <div className="card">
          <div className="card-header">
            <h2>📋 {ctx.user.username}'s Watched Movies</h2>
          </div>
          <div className="card-body">
            {reviews.length === 0 ? (
              <p className="empty-state">
                You haven't watched any movies yet. <a href="/">Browse movies</a> to get started!
              </p>
            ) : reviews.map(review => (
              <div key={review.id} className="watched-item">
                <div className="watched-poster">{getGenreEmoji(review.movie?.genre)}</div>
                <div className="watched-info">
                  <h3><a href={`/movies/${review.movieId}`}>{review.movie?.title || 'Unknown'}</a></h3>
                  <div className="watched-meta">
                    Watched {new Date(review.watchedAt).toLocaleDateString()}
                  </div>
                  {review.comment && <div className="watched-comment">{review.comment}</div>}
                </div>
                <div className="watched-rating" style={{ color: '#f1c40f' }}>
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

function getGenreEmoji(genre?: string) {
  const map: Record<string, string> = {
    Action: '💥', Comedy: '😂', Drama: '🎭', Horror: '👻',
    'Sci-Fi': '🚀', Romance: '💕', Thriller: '😱', Documentary: '📹',
  };
  return genre ? map[genre] || '🎬' : '🎬';
}
