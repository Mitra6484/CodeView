import useMeetingActions from "@/hooks/useMeetingActions";
import { Doc } from "../../convex/_generated/dataModel";
import { getMeetingStatus } from "@/lib/utils";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { CalendarIcon } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useAuth } from "@clerk/clerk-react";

type Interview = Doc<"interviews">;

interface MeetingCardProps {
  interview: Interview;
  onEdit?: (interview: Interview) => void;
}

function MeetingCard({ interview, onEdit }: MeetingCardProps) {
  const { joinMeeting } = useMeetingActions();
  const { userId } = useAuth();

  const status = getMeetingStatus(interview);
  const formattedDate = format(new Date(interview.startTime), "EEEE, MMMM d · h:mm a");

  const isInterviewer = interview.interviewerIds.includes(userId || "");

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="space-y-2 flex-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarIcon className="h-4 w-4" />
          <span>{formattedDate}</span>
          <Badge
            variant={
              status === "live" ? "default" : status === "scheduled" ? "secondary" : "outline"
            }
            className="ml-2"
          >
            {status === "live" ? "Live Now" : status === "scheduled" ? "Scheduled" : "Completed"}
          </Badge>
        </div>

        <CardTitle className="line-clamp-2">{interview.title}</CardTitle>

        {interview.description && (
          <CardDescription className="line-clamp-3">{interview.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-2">
        {status === "live" && (
          <Button className="w-full" onClick={() => joinMeeting(interview.streamCallId)}>
            Join Meeting
          </Button>
        )}

        {status === "scheduled" && onEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(interview)}
          >
            Edit
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
export default MeetingCard;