import { Response } from 'express';

interface Client {
  id: string;
  res: Response;
  auctionId?: string;
}

let clients: Client[] = [];

export const SseService = {
  addClient(id: string, res: Response, auctionId?: string) {
    clients.push({ id, res, auctionId });
    console.log(`SSE client connected. ID: ${id}, Auction ID: ${auctionId || 'All'}. Total clients: ${clients.length}`);
  },

  removeClient(id: string) {
    clients = clients.filter(client => client.id !== id);
    console.log(`SSE client disconnected. ID: ${id}. Total clients: ${clients.length}`);
  },

  broadcast(eventName: string, data: any, auctionId?: string) {
    clients.forEach(client => {
      // If broadcast targets a specific auction, only send to matching clients (or clients watching all)
      if (!auctionId || !client.auctionId || client.auctionId === auctionId) {
        try {
          client.res.write(`event: ${eventName}\n`);
          client.res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch (error) {
          console.error(`Error sending SSE to client ${client.id}:`, error);
        }
      }
    });
  }
};
