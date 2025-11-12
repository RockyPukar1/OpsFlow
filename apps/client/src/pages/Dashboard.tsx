import type { Task } from '@opsflow/types';
import { useQuery } from '@tanstack/react-query';
import { Plus, TrendingUp, Users, CheckCircle, Clock } from 'lucide-react';
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Layout } from '@/components/layout/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { socketService } from '@/lib/socket';
import { projectService } from '@/services/projectService';
import { taskService } from '@/services/taskService';
import { useAuthStore } from '@/store/authStore';

const Dashboard: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  // Fetch recent projects
  const { data: projectsData } = useQuery({
    queryKey: ['projects', 1, 5],
    queryFn: () => projectService.getProjects(1, 5),
  });

  // Fetch recent tasks
  const { data: tasksData } = useQuery({
    queryKey: ['tasks', { page: 1, limit: 10 }],
    queryFn: () => taskService.getTasks({ page: 1, limit: 10 }),
  });

  // Set up real-time notifications
  useEffect(() => {
    const socket = socketService.getSocket();
    if (socket) {
      socketService.onNotification((notification) => {
        toast.success(notification.message);
      });

      socketService.onUserOnline((data) => {
        console.log('User came online:', data);
      });

      socketService.onActivityUpdate((data) => {
        console.log('Activity update:', data);
      });
    }

    return () => {
      socketService.removeAllListeners();
    };
  }, []);

  const stats = [
    {
      title: 'Total Projects',
      value: projectsData?.meta?.total || 0,
      description: 'Active projects',
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Tasks',
      value: tasksData?.meta?.total || 0,
      description: 'All tasks',
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Completed Tasks',
      value: tasksData?.data?.filter((task: Task) => task.status === 'done').length || 0,
      description: 'This month',
      icon: CheckCircle,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Team Members',
      value: projectsData?.data?.reduce((acc, project) => acc + project.members.length, 0) || 0,
      description: 'Across all projects',
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name}!</h1>
            <p className="text-muted-foreground">
              Here's what's happening with your projects today.
            </p>
          </div>
          <div className="flex space-x-2">
            <Button asChild>
              <Link to="/projects">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <div className={`p-2 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Projects and Tasks */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Recent Projects */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Your most recently created projects</CardDescription>
            </CardHeader>
            <CardContent>
              {projectsData?.data?.length ? (
                <div className="space-y-4">
                  {projectsData.data.slice(0, 3).map((project) => (
                    <div
                      key={project._id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <h3 className="font-medium leading-none">{project.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {project.members.length + 1} members
                        </p>
                      </div>
                      <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                        {project.status}
                      </Badge>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/projects">View All Projects</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-4">No projects yet</p>
                  <Button asChild>
                    <Link to="/projects">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Project
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Recent Tasks</CardTitle>
              <CardDescription>Latest task updates</CardDescription>
            </CardHeader>
            <CardContent>
              {tasksData?.data?.length ? (
                <div className="space-y-4">
                  {tasksData.data.slice(0, 5).map((task: Task) => (
                    <div key={task._id} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-sm font-medium leading-none">{task.title}</h3>
                        <p className="text-xs text-muted-foreground">{task.project.name}</p>
                      </div>
                      <Badge
                        variant={
                          task.status === 'done'
                            ? 'default'
                            : task.status === 'in-progress'
                              ? 'secondary'
                              : 'outline'
                        }
                        className="text-xs"
                      >
                        {task.status.replace('-', ' ')}
                      </Badge>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/tasks">View All Tasks</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground text-sm">No tasks yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
