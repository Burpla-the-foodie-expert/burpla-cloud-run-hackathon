from sqlalchemy import create_engine, Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
import os

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'

    user_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False)
    name = Column(String)
    avatar_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    messages = relationship("Message", back_populates="user")
    memberships = relationship("GroupMember", back_populates="user")

class Group(Base):
    __tablename__ = 'groups'

    group_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    messages = relationship("Message", back_populates="group")
    members = relationship("GroupMember", back_populates="group")

class GroupMember(Base):
    __tablename__ = 'group_members'

    group_id = Column(String, ForeignKey('groups.group_id'), primary_key=True)
    user_id = Column(String, ForeignKey('users.user_id'), primary_key=True)
    joined_at = Column(DateTime, default=datetime.utcnow)

    group = relationship("Group", back_populates="members")
    user = relationship("User", back_populates="memberships")

class Message(Base):
    __tablename__ = 'messages'

    message_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String, ForeignKey('groups.group_id'), nullable=False)
    user_id = Column(String, ForeignKey('users.user_id'), nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    group = relationship("Group", back_populates="messages")
    user = relationship("User", back_populates="messages")

# Database Connection
# For local dev, you can use a local postgres or sqlite for testing
# For Cloud Run, use the Cloud SQL connection string
def get_db_engine():
    db_url = os.getenv("DATABASE_URL", "sqlite:///./gcs_chat.db")
    return create_engine(db_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=get_db_engine())

def init_db():
    engine = get_db_engine()
    Base.metadata.create_all(bind=engine)
