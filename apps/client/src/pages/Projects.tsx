import type { Project } from '@opsflow/types';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import React, { useState } from 'react';

import { Layout } from '@/components/layout/Layout';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { projectService } from '@/services/projectService';

const Projects: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 12;

  const {
    data: projectsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['projects', page, limit],
    queryFn: () => projectService.getProjects(page, limit),
  });

  const handleEdit = (project: Project) => {
    // TODO: Implement edit functionality
    console.log('Edit project:', project);
  };

  const handleDelete = (project: Project) => {
    // TODO: Implement delete functionality
    console.log('Delete project:', project);
  };

  const handleView = (project: Project) => {
    // TODO: Navigate to project detail page
    console.log('View project:', project);
  };

  const filteredProjects =
    projectsData?.data?.filter(
      (project) =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-red-600">Error loading projects. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">
              Manage your projects and collaborate with your team.
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project._id}
                  project={project}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onView={handleView}
                />
              ))}
            </div>

            {/* Pagination */}
            {projectsData && projectsData.meta && projectsData.meta.totalPages > 1 && (
              <div className="flex justify-center space-x-2">
                <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <span className="flex items-center px-4 py-2 text-sm text-muted-foreground">
                  Page {page} of {projectsData.meta?.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page === projectsData.meta.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                {searchQuery ? (
                  <>
                    <p className="text-muted-foreground mb-4">
                      No projects found matching "{searchQuery}"
                    </p>
                    <Button variant="outline" onClick={() => setSearchQuery('')}>
                      Clear Search
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground mb-4">No projects found.</p>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Project
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <CreateProjectModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </div>
    </Layout>
  );
};

export default Projects;
