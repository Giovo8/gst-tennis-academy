/**
 * Esempio di utilizzo dei nuovi componenti Enterprise
 * Questa pagina mostra come usare tutti i componenti del nuovo design system
 */

"use client";

import { useState } from "react";
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardFooter,
  Badge,
  Alert,
  Input,
  Modal,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  useToast 
} from "@/components/ui";
import { PageHeader, PageContainer, StatsCard, EmptyState } from "@/components/layout/DashboardComponents";
import { 
  Users, 
  Calendar, 
  Trophy, 
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Inbox
} from "lucide-react";

export default function DesignSystemDemo() {
  const { addToast } = useToast();
  const [email, setEmail] = useState("");

  const handleSuccess = () => {
    addToast({
      variant: "success",
      title: "Success!",
      message: "Your action was completed successfully.",
      duration: 5000,
    });
  };

  const handleError = () => {
    addToast({
      variant: "error",
      title: "Error",
      message: "Something went wrong. Please try again.",
      duration: 5000,
    });
  };

  return (
    <PageContainer maxWidth="xl">
      {/* Page Header */}
      <PageHeader
        title="Design System Demo"
        description="Esempio completo di tutti i componenti enterprise disponibili"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Examples", href: "/dashboard/examples" },
          { label: "Design System" },
        ]}
        actions={
          <>
            <Button variant="outline" leftIcon={<Download />}>
              Export
            </Button>
            <Button variant="primary" leftIcon={<Plus />}>
              Create New
            </Button>
          </>
        }
      />

      <div className="space-y-8">
        {/* Stats Cards */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Statistics Cards
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              label="Total Users"
              value="2,543"
              icon={<Users className="h-6 w-6" />}
              trend={{ value: 12.5, isPositive: true }}
              color="blue"
            />
            <StatsCard
              label="Bookings Today"
              value="48"
              icon={<Calendar className="h-6 w-6" />}
              trend={{ value: 8.2, isPositive: true }}
              color="emerald"
            />
            <StatsCard
              label="Active Tournaments"
              value="12"
              icon={<Trophy className="h-6 w-6" />}
              trend={{ value: -3.1, isPositive: false }}
              color="amber"
            />
            <StatsCard
              label="Revenue"
              value="€45.2k"
              icon={<TrendingUp className="h-6 w-6" />}
              trend={{ value: 15.3, isPositive: true }}
              color="blue"
            />
          </div>
        </section>

        {/* Buttons Showcase */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Button Variants
          </h3>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="success">Success</Button>
                  <Button variant="warning">Warning</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="link">Link</Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button size="xs">Extra Small</Button>
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                  <Button size="xl">Extra Large</Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button leftIcon={<Plus />}>With Left Icon</Button>
                  <Button rightIcon={<Upload />}>With Right Icon</Button>
                  <Button isLoading>Loading</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Badges */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Badge Variants
          </h3>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <Badge variant="default">Default</Badge>
                <Badge variant="primary">Primary</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="success" icon>With Icon</Badge>
                <Badge variant="error" dot>With Dot</Badge>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Alerts */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Alert Messages
          </h3>
          <div className="space-y-4">
            <Alert variant="success" title="Success">
              Your changes have been saved successfully.
            </Alert>
            <Alert variant="error" title="Error" dismissible onDismiss={() => {}}>
              There was an error processing your request.
            </Alert>
            <Alert variant="warning" title="Warning">
              Please review your information before submitting.
            </Alert>
            <Alert variant="info">
              New features are now available. Check them out!
            </Alert>
          </div>
        </section>

        {/* Forms */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Form Elements
          </h3>
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  hint="We'll never share your email"
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="Enter password"
                  error="Password must be at least 8 characters"
                />
                <Input
                  label="Disabled Input"
                  placeholder="Disabled"
                  disabled
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="primary" fullWidth>
                Submit
              </Button>
            </CardFooter>
          </Card>
        </section>

        {/* Modal Example */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Modal Dialog
          </h3>
          <Card>
            <CardContent className="pt-6">
              <Modal>
                <ModalTrigger>
                  <Button>Open Modal</Button>
                </ModalTrigger>
                <ModalContent size="md">
                  <ModalHeader>
                    <ModalTitle>Confirm Action</ModalTitle>
                    <ModalDescription>
                      Are you sure you want to proceed with this action?
                    </ModalDescription>
                  </ModalHeader>
                  <ModalBody>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      This action cannot be undone. Please confirm that you want to continue.
                    </p>
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="ghost">Cancel</Button>
                    <Button variant="danger">Confirm</Button>
                  </ModalFooter>
                </ModalContent>
              </Modal>
            </CardContent>
          </Card>
        </section>

        {/* Toast Notifications */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Toast Notifications
          </h3>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleSuccess} variant="success">
                  Show Success Toast
                </Button>
                <Button onClick={handleError} variant="danger">
                  Show Error Toast
                </Button>
                <Button
                  onClick={() =>
                    addToast({
                      variant: "warning",
                      title: "Warning",
                      message: "Please be careful with this action.",
                    })
                  }
                  variant="warning"
                >
                  Show Warning Toast
                </Button>
                <Button
                  onClick={() =>
                    addToast({
                      variant: "info",
                      message: "Information message here.",
                    })
                  }
                >
                  Show Info Toast
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Empty State */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Empty State
          </h3>
          <Card>
            <EmptyState
              icon={<Inbox className="h-12 w-12" />}
              title="No items found"
              description="Get started by creating your first item. It will appear here once created."
              action={
                <Button variant="primary" leftIcon={<Plus />}>
                  Create First Item
                </Button>
              }
            />
          </Card>
        </section>

        {/* Card Variants */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Card Variants
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card variant="default">
              <CardHeader>
                <CardTitle>Default Card</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  This is a default card with standard styling.
                </p>
              </CardContent>
            </Card>
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Elevated Card</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  This card has elevation with shadow.
                </p>
              </CardContent>
            </Card>
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Bordered Card</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  This card has a prominent border.
                </p>
              </CardContent>
            </Card>
            <Card variant="interactive" hover>
              <CardHeader>
                <CardTitle>Interactive Card</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  This card responds to hover with cursor pointer.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
