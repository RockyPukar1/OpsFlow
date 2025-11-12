import type { Task } from '@opsflow/types';
import { Calendar, User, Flag, MoreVertical } from 'lucide-react';
import React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo':
        return 'secondary';
      case 'in-progress':
        return 'default';
      case 'review':
        return 'outline';
      case 'done':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <h3 className="font-medium text-sm leading-none">{task.title}</h3>
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(task)} className="text-red-600">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Status and Priority */}
        <div className="flex items-center justify-between">
          <Badge variant={getStatusColor(task.status)} className="text-xs">
            {task.status.replace('-', ' ')}
          </Badge>
          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
            <Flag className="h-3 w-3 mr-1" />
            {task.priority}
          </Badge>
        </div>

        {/* Assignee and Due Date */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {task.assignee ? (
            <div className="flex items-center space-x-1">
              <Avatar className="h-4 w-4">
                <AvatarImage src={`https://avatar.vercel.sh/${task.assignee.email}`} />
                <AvatarFallback className="text-xs">
                  {task.assignee.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>
              <span>{task.assignee.name}</span>
            </div>
          ) : (
            <div className="flex items-center">
              <User className="h-3 w-3 mr-1" />
              Unassigned
            </div>
          )}

          {task.dueDate && (
            <div className={`flex items-center ${isOverdue ? 'text-red-600' : ''}`}>
              <Calendar className="h-3 w-3 mr-1" />
              {formatDate(task.dueDate)}
            </div>
          )}
        </div>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                {tag}
              </Badge>
            ))}
            {task.tags.length > 3 && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                +{task.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Project */}
        <div className="text-xs text-muted-foreground">Project: {task.project.name}</div>
      </CardContent>
    </Card>
  );
};
