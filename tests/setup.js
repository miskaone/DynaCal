// Mock Chrome APIs for testing
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn()
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn()
  }
};
