/**
 * Runs before any e2e test module is imported (Jest `setupFiles`). We point
 * the app at an in-memory SQLite database so every e2e run starts from a
 * clean, throwaway schema and never touches the real dev database file.
 *
 * These must be set here (not inside a test) because the TypeORM options are
 * read when AppModule is first imported.
 */
process.env.DATABASE_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.STARTING_BALANCE = '100';
process.env.PORT = '0';
// Effectively disable rate limiting for the functional suites (they issue many
// requests from one IP). The dedicated throttle spec overrides these to prove
// the limiter actually triggers.
process.env.THROTTLE_LIMIT = '1000000';
process.env.THROTTLE_AUTH_LIMIT = '1000000';
