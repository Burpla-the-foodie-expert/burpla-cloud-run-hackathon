import os
import json
import redis
from typing import Callable
import asyncio
from google.cloud import pubsub_v1
import google.auth

class PubSubService:
    def publish(self, channel: str, message: dict):
        raise NotImplementedError

    async def subscribe(self, channel: str, callback: Callable):
        raise NotImplementedError

class RedisPubSub(PubSubService):
    def __init__(self):
        # In Cloud Run, set REDIS_HOST to the IP of your Cloud Memorystore instance
        self.redis_host = os.getenv("REDIS_HOST", "localhost")
        self.redis_port = int(os.getenv("REDIS_PORT", 6379))
        self.redis_client = redis.Redis(host=self.redis_host, port=self.redis_port, db=0)
        self.pubsub = self.redis_client.pubsub()

    def publish(self, channel: str, message: dict):
        """Publish a message to a specific channel."""
        self.redis_client.publish(channel, json.dumps(message))

    async def subscribe(self, channel: str, callback: Callable):
        """Subscribe to a channel and execute callback on new messages."""
        self.pubsub.subscribe(channel)

        # This is a blocking loop, meant to be run in a background task
        for message in self.pubsub.listen():
            if message['type'] == 'message':
                data = json.loads(message['data'])
                await callback(data)

    def unsubscribe(self, channel: str):
        self.pubsub.unsubscribe(channel)

class GCPPubSub(PubSubService):
    def __init__(self):
        _, project_id = google.auth.default()
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT", project_id)
        self.topic_id = os.getenv("PUBSUB_TOPIC", "burpla-chat-messages")

        self.publisher = pubsub_v1.PublisherClient()
        self.topic_path = self.publisher.topic_path(self.project_id, self.topic_id)

        # Note: Subscription logic is different in GCP Pub/Sub (pull/push).
        # This class primarily handles publishing for now.
        # For receiving, you'd typically have a separate worker or use a pull subscription.

    def publish(self, channel: str, message: dict):
        """
        Publish a message.
        'channel' is sent as an attribute 'group_id' to allow filtering.
        """
        data_str = json.dumps(message)
        data = data_str.encode("utf-8")

        # Publish with 'group_id' attribute
        future = self.publisher.publish(self.topic_path, data, group_id=channel)
        try:
            future.result()
        except Exception as e:
            print(f"Failed to publish to Pub/Sub: {e}")

    async def subscribe(self, channel: str, callback: Callable):
        # Implementing a pull subscriber here is complex and requires a subscription to exist.
        # For this hackathon scope, we might assume we just publish to GCP.
        pass

def get_pubsub_client() -> PubSubService:
    backend = os.getenv("PUBSUB_BACKEND", "redis").lower()
    if backend == "gcp":
        return GCPPubSub()
    return RedisPubSub()
