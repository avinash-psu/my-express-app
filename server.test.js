const request = require('supertest');
const express = require('express');
const { app, server } = require('./server');

// Mock the Google OAuth client
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({
      getPayload: jest.fn().mockReturnValue({ sub: 'testUserId' })
    })
  }))
}));

describe('Server API', () => {
  let server;
  let agent;

  beforeAll((done) => {
    server = app.listen(4000, (err) => {
      if (err) return done(err);
      agent = request.agent(server);
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('POST /api/user', () => {
    it('should create a new user', async () => {
      const res = await agent
        .post('/api/user')
        .set('Authorization', 'valid-token')
        .send({ email: 'test@example.com', name: 'Test User' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe('test@example.com');
      expect(res.body.name).toBe('Test User');
    });
  });

  describe('GET /api/tasks', () => {
    it('should return an array of tasks', async () => {
      const res = await agent
        .get('/api/tasks')
        .set('Authorization', 'valid-token');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBeTruthy();
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const res = await agent
        .post('/api/tasks')
        .set('Authorization', 'valid-token')
        .send({ text: 'New Task', category: 'Test', priority: 'High' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body.text).toBe('New Task');
      expect(res.body.category).toBe('Test');
      expect(res.body.priority).toBe('High');
      expect(res.body.completed).toBe(false);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update an existing task', async () => {
      // First, create a task
      const createRes = await agent
        .post('/api/tasks')
        .set('Authorization', 'valid-token')
        .send({ text: 'Task to Update', category: 'Test', priority: 'Low' });

      const updateRes = await agent
        .put(`/api/tasks/${createRes.body.id}`)
        .set('Authorization', 'valid-token')
        .send({ text: 'Updated Task', completed: true, category: 'Updated', priority: 'High' });

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.text).toBe('Updated Task');
      expect(updateRes.body.completed).toBe(true);
      expect(updateRes.body.category).toBe('Updated');
      expect(updateRes.body.priority).toBe('High');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete an existing task', async () => {
      // First, create a task
      const createRes = await agent
        .post('/api/tasks')
        .set('Authorization', 'valid-token')
        .send({ text: 'Task to Delete', category: 'Test', priority: 'Medium' });

      const deleteRes = await agent
        .delete(`/api/tasks/${createRes.body.id}`)
        .set('Authorization', 'valid-token');

      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.body.message).toBe('Task deleted');
    });
  });
});
